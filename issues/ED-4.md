# ED-4: Entity page (core desk view)

**Milestone:** ED-M2  
**Priority:** P0  
**Estimate:** M  

### Description
Stable route `/entity/:id` (URL-encode or slugify `osmf:…` safely). Show summary, aliases, external IDs, claims in/out, one-hop related entities, outbound network URLs.

### Acceptance criteria
- [ ] All seed entities in dump resolve to a page
- [ ] Claims show tier, sources, limitations, reviewed_at, status
- [ ] Superseded claims in collapsed history
- [ ] 404 for unknown IDs
- [ ] Deep link stable across builds for same entity id

### Blocked by
ED-2, ED-3

---
_Part of epic: Evidence Desk MVP_
