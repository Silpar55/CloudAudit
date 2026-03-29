"""
Ensure a row exists in `resources` before inserting into tables that FK to resources.resource_id.
Matches backend behavior in recommendations.model.js.
"""


def ensure_resource_row(cursor, aws_account_id: str, resource_id: str | None, service: str, region: str) -> None:
    if not resource_id or resource_id == "Unknown":
        return
    upsert = """
        INSERT INTO resources (resource_id, aws_account_id, service, instance_type, region, last_seen)
        VALUES (%s, %s, %s, %s, %s, NOW())
        ON CONFLICT (resource_id) DO UPDATE SET last_seen = NOW();
    """
    cursor.execute(
        upsert,
        (
            resource_id,
            aws_account_id,
            (service or "UnknownService").strip() or "UnknownService",
            "unknown",
            (region or "UnknownRegion").strip() or "UnknownRegion",
        ),
    )
