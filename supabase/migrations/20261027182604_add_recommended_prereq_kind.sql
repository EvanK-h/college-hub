-- Phase 4: "recommended" links between courses, for advice the catalogue gives but doesn't require
-- ("prior completion of Calculus 2 is strongly recommended") and for lead-ins in your own plan
-- (PHYS 4115 before PHYS 5352). The prerequisite graph draws them; the move checks ignore them.
-- See the 2026-10-27 decision.

alter type prereq_kind add value 'recommended';
