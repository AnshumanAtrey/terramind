# Demo Imagery — Sources & License

These are the simulated "drone camera frames" the AI vision service (MiniMax-M3)
analyzes. All are **public-domain** aerial/satellite photographs of real military
installations, sourced from **Wikimedia Commons** (U.S. Government works — USAF / U.S.
Navy — are public domain). They are the same kind of overhead imagery publicly visible
on Google Maps, used here for an academic demonstration.

| File | Subject | Source (Wikimedia Commons) | License |
|------|---------|----------------------------|---------|
| `boneyard_amarg.jpg` | AMARG aircraft "boneyard", Davis-Monthan AFB | *Airplane Graveyard* | Public domain |
| `norfolk_carriers.jpg` | 9 aircraft carriers, Naval Station Norfolk | *9 Flattops at Norfolk naval base, 2012* | Public domain |
| `naval_subic.jpg` | Warships, Naval Base Subic Bay | *Aerial view of Naval Base Subic Bay* | Public domain |
| `naval_yokosuka.jpg` | Cruisers/destroyers, U.S. Naval Base Yokosuka | *Aerial view of U.S. Naval Base Yokosuka, 1994* | Public domain |
| `amphib_littlecreek.jpg` | Dock landing ships, Naval Amphibious Base Little Creek | *Aerial view … Little Creek (LSD-41, LSD-48)* | Public domain |
| `naval_fordisland.jpg` | Naval anchorage, Ford Island | *Looking north over Ford Island* | Public domain |

To use your own imagery, drop any `.png/.jpg/.jpeg/.webp` into this folder — the AI
service auto-discovers it (`GET /frames`). `seed_frames.py` can regenerate synthetic
placeholder frames if you need offline fallbacks.
