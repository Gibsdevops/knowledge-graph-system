import numpy as np
import tensorflow as tf
from tensorflow.keras import Model
from tensorflow.keras.layers import Dense, Dropout
from scipy.sparse import coo_matrix
from sklearn.neighbors import NearestNeighbors


class SimpleGCN(Model):
    def __init__(self, num_classes):
        super().__init__()
        self.dense1 = Dense(16, activation="relu")
        self.dropout = Dropout(0.3)
        self.dense2 = Dense(num_classes, activation="softmax")

    def call(self, inputs, training=False):
        x, a = inputs

        x = tf.matmul(a, x)
        x = self.dense1(x)

        x = self.dropout(x, training=training)

        x = tf.matmul(a, x)
        x = self.dense2(x)

        return x


label_classes = np.load("models/label_classes.npy", allow_pickle=True)
cause_classes = np.load("models/cause_classes.npy", allow_pickle=True)

num_classes = len(label_classes)

model = SimpleGCN(num_classes)


def build_graph_from_dataframe(df):
    df = df.copy()

    df["damage_cause"] = df["damage_cause"].fillna("Unknown")

    cause_to_index = {
        cause: idx for idx, cause in enumerate(cause_classes)
    }

    df["damage_cause_encoded"] = df["damage_cause"].map(cause_to_index)
    df["damage_cause_encoded"] = df["damage_cause_encoded"].fillna(0)

    X = df[[
        "latitude",
        "longitude",
        "damage_cause_encoded"
    ]].values.astype("float32")

    num_nodes = X.shape[0]

    coords = df[["latitude", "longitude"]].values

    n_neighbors = min(4, num_nodes)

    nbrs = NearestNeighbors(n_neighbors=n_neighbors)
    nbrs.fit(coords)

    distances, indices = nbrs.kneighbors(coords)

    edge_sources = []
    edge_targets = []
    edge_weights = []

    for i, neighbors in enumerate(indices):
        for j, neighbor_idx in enumerate(neighbors):
            if neighbor_idx == i:
                continue

            distance = distances[i][j]
            weight = 1 / (1 + distance)

            edge_sources.append(i)
            edge_targets.append(neighbor_idx)
            edge_weights.append(weight)

    edge_index = np.array(
        [edge_sources, edge_targets],
        dtype="int64"
    )

    edge_weight = np.array(
        edge_weights,
        dtype="float32"
    )

    A_sparse = coo_matrix(
        (edge_weight, (edge_index[0], edge_index[1])),
        shape=(num_nodes, num_nodes)
    )

    A_dense = tf.convert_to_tensor(
        A_sparse.toarray(),
        dtype=tf.float32
    )

    I = tf.eye(num_nodes)
    A_hat = A_dense + I

    D = tf.reduce_sum(A_hat, axis=1)
    D_inv_sqrt = tf.linalg.diag(
        1.0 / tf.sqrt(D + 1e-8)
    )

    A_norm = tf.matmul(
        tf.matmul(D_inv_sqrt, A_hat),
        D_inv_sqrt
    )

    X_tf = tf.convert_to_tensor(X, dtype=tf.float32)

    return X_tf, A_norm


def predict_dataframe(df):
    X_tf, A_norm = build_graph_from_dataframe(df)

    # Build model variables
    _ = model([X_tf, A_norm], training=False)

    # Load weights after model is built
    model.load_weights("models/orchard_gnn.weights.h5")

    predictions = model([X_tf, A_norm], training=False)

    predicted_classes = tf.argmax(predictions, axis=1).numpy()
    predicted_labels = label_classes[predicted_classes]

    df = df.copy()
    df["predicted_class"] = predicted_labels

    return df