-- Align default with Lavo, Inc. nationwide agreements (displayed copy lives in app).
alter table contracts alter column governing_law set default 'Delaware';
