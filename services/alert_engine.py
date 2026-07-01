# ============================================================
# ALERT ENGINE — deterministic threshold detection
# Rules live in CODE, not in the AI. This is how real
# monitoring systems work: fixed thresholds, reliable output.
# The AI's job is to EXPLAIN these alerts, not invent them.
# ============================================================

from services.agent_db import create_alert

# NTT targets — single source of truth
CSAT_TARGET = 92.0   # teams/regions below this get flagged
DSAT_TARGET = 4.0    # teams/regions above this get flagged


def severity_for_csat(csat: float) -> str:
    if csat < 80:
        return "High"
    if csat < 90:
        return "Medium"
    return "Low"


def scan_and_create_alerts():
    """
    Runs fixed-rule checks against current metrics and
    creates alerts for anything below target.
    Returns a list of what was flagged (for the AI to explain).
    Deduplication is handled inside create_alert().
    """
    from services.data_service import get_metrics
    m = get_metrics()
    if m.get('total', 0) == 0:
        return []

    flagged = []

    # ── Check every team ──────────────────────────────────
    for team, d in m.get('team_breakdown', {}).items():
        csat = float(d.get('csat_pct', 0))
        if csat < CSAT_TARGET:
            sev = severity_for_csat(csat)
            msg = (f"{team} team CSAT is {csat}%, "
                   f"{round(CSAT_TARGET - csat, 1)}% below the "
                   f"{CSAT_TARGET}% target")
            created = create_alert(
                alert_type="Team Performance",
                entity=team, metric="CSAT",
                value=csat, target=CSAT_TARGET,
                severity=sev, message=msg,
            )
            flagged.append({
                "entity": team, "metric": "CSAT",
                "value": csat, "severity": sev,
                "newly_created": created,
            })

    # ── Check every region ────────────────────────────────
    for region, d in m.get('region_breakdown', {}).items():
        csat = float(d.get('csat_pct', 0))
        if csat < CSAT_TARGET:
            sev = severity_for_csat(csat)
            msg = (f"{region} region CSAT is {csat}%, "
                   f"{round(CSAT_TARGET - csat, 1)}% below the "
                   f"{CSAT_TARGET}% target")
            created = create_alert(
                alert_type="Region Performance",
                entity=region, metric="CSAT",
                value=csat, target=CSAT_TARGET,
                severity=sev, message=msg,
            )
            flagged.append({
                "entity": region, "metric": "CSAT",
                "value": csat, "severity": sev,
                "newly_created": created,
            })

    return flagged