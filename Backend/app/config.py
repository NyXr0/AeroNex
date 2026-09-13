"""
Single source of truth for the 3 locked routes x 3 fare windows (Build
Order Phase 1.3/1.4). DGCA traffic weight picked these 3 candidates first;
live-testing all 9 route x window combinations end-to-end on 2026-09-14
(see Backend/README.md's "Live run #6" section) is what actually confirmed
them per the Build Order's "observe reliability, don't just pick by
importance" instruction - so the lock is now real, not provisional.
"""
LOCKED_ROUTES = [("DEL", "BOM"), ("DEL", "BLR"), ("BOM", "BLR")]
FARE_WINDOWS = [1, 15, 30]
