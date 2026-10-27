-- Phase 4: the Quantum / AI focus. Swap options get a second relevance, for the AI direction,
-- sharing the quantum scale; the enum is renamed so its name fits both columns. The values are
-- drafted in scripts/ai-relevance.ts and loaded with scripts/import-ai-relevance.ts.

alter type quantum_relevance rename to relevance;

alter table swap_options add column ai_relevance relevance not null default 'none';
