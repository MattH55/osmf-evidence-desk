# ED-2: Ingest evidence-graph dump at build time

**Milestone:** ED-M1  
**Priority:** P0  
**Estimate:** M  

### Description
Build step loads `latest.json` (or per-entity files), validates minimally against expected shape, and produces an in-repo or generated index Desk can render.

### Acceptance criteria
- [ ] Documented dump path / fetch step
- [ ] Build fails if dump missing or `schema_version` unsupported
- [ ] `meta.is_example` exposed to UI
- [ ] Seed conditions from dump available to pages

### Blocked by
ED-1

---
_Part of epic: Evidence Desk MVP_
