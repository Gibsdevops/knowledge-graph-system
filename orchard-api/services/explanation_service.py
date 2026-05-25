from services.neo4j_service import driver


def get_tree_explanation(tree_id):
    query = """
    MATCH (t:Tree {tree_id: toString($tree_id)})

    OPTIONAL MATCH (t)-[:AFFECTED_BY]->(c:Cause)

    OPTIONAL MATCH (t)-[:NEAR]->(n:Tree)

    RETURN
        t.tree_id AS tree_id,
        t.predicted_class AS predicted_class,
        c.name AS damage_cause,
        collect({
            tree_id: n.tree_id,
            predicted_class: n.predicted_class
        }) AS neighbors
    """

    with driver.session() as session:
        result = session.run(query, tree_id=tree_id)

        record = result.single()

        if not record:
            return None

        neighbors = [
            n for n in record["neighbors"]
            if n["tree_id"] is not None
        ]

        high_neighbors = sum(
            1 for n in neighbors
            if n["predicted_class"] == "High"
        )

        medium_neighbors = sum(
            1 for n in neighbors
            if n["predicted_class"] == "Medium"
        )

        explanations = []

        if high_neighbors > 0:
            explanations.append(
                f"Near {high_neighbors} high-risk trees."
            )

        if medium_neighbors > 0:
            explanations.append(
                f"Near {medium_neighbors} medium-risk trees."
            )

        if record["damage_cause"]:
            explanations.append(
                f"Associated with {record['damage_cause']}."
            )

        return {
            "tree_id": record["tree_id"],
            "predicted_class": record["predicted_class"],
            "damage_cause": record["damage_cause"],
            "neighbors": neighbors,
            "explanations": explanations
        }