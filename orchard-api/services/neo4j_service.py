import os
from neo4j import GraphDatabase
from dotenv import load_dotenv
from sklearn.neighbors import NearestNeighbors

load_dotenv()

URI = os.getenv("NEO4J_URI")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

driver = GraphDatabase.driver(
    URI,
    auth=(USERNAME, PASSWORD)
)


def save_predictions_to_neo4j(df):
    with driver.session() as session:
        session.execute_write(clear_old_graph)

        for row in df.to_dict("records"):
            session.execute_write(create_tree_and_cause, row)

        create_spatial_edges(df, session)


def clear_old_graph(tx):
    tx.run("""
    MATCH (n)
    DETACH DELETE n
    """)


def create_tree_and_cause(tx, row):
    tx.run("""
    MERGE (t:Tree {tree_id: toString($tree_no)})
    SET t.latitude = toFloat($latitude),
        t.longitude = toFloat($longitude),
        t.image = $image,
        t.mango_id = toString($mango_id),
        t.damage_severity = $damage_severity,
        t.predicted_class = $predicted_class

    MERGE (c:Cause {name: $damage_cause})
    MERGE (t)-[:AFFECTED_BY]->(c)

    MERGE (p:Prediction {class: $predicted_class})
    MERGE (t)-[:PREDICTED_AS]->(p)
    """, **row)


def create_near_edge(tx, source, target, weight):
    tx.run("""
    MATCH (a:Tree {tree_id: toString($source)})
    MATCH (b:Tree {tree_id: toString($target)})
    MERGE (a)-[r:NEAR]->(b)
    SET r.weight = toFloat($weight)
    """, source=source, target=target, weight=weight)


def create_spatial_edges(df, session):
    coords = df[["latitude", "longitude"]].values
    n_neighbors = min(4, len(df))

    nbrs = NearestNeighbors(n_neighbors=n_neighbors)
    nbrs.fit(coords)

    distances, indices = nbrs.kneighbors(coords)

    for i, neighbors in enumerate(indices):
        source = df.iloc[i]["tree_no"]

        for j, neighbor_idx in enumerate(neighbors):
            if neighbor_idx == i:
                continue

            target = df.iloc[neighbor_idx]["tree_no"]
            distance = distances[i][j]
            weight = 1 / (1 + distance)

            session.execute_write(
                create_near_edge,
                source,
                target,
                float(weight)
            )