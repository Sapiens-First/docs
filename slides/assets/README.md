# Image sources

Downloaded October 6, 2026. `sources.json` records original URLs, photographer credits, intended use, and SHA-256 digests of the checked-in bytes. Builds read these local files and embed them; viewing the HTML makes no image requests.

| File | Source and credit | Use |
| --- | --- | --- |
| `civic-park.jpg` | [Jamie Street / Unsplash](https://unsplash.com/photos/people-in-park-JPyRvvUnQjU) | People sharing a playground on London's South Bank; closing next-step slide |
| `city-night.jpg` | [Nicolao Negrello / Unsplash](https://unsplash.com/photos/aerial-view-of-cityscape-during-night-time-vQy71wPTvgM) | Downtown Los Angeles from City Hall; technology section |
| `sapiens-contours.svg` | [Sapiens First strategy artwork](https://sapiensfirst.org/assets/homepage-strategy-contours.svg) | Decorative contours |
| `sapiens-arcs.svg` | [Sapiens First involvement artwork](https://sapiensfirst.org/assets/homepage-involved-arcs.svg) | Decorative arcs |

Both photographs are free images under the [Unsplash License](https://unsplash.com/license), which allows downloading and use for commercial and noncommercial purposes. They are illustrative stock photographs, not photographs of Sapiens First events. Photographer, source, and license credits appear separately in each relevant slide's speaker notes.

The two SVG files are unmodified first-party artwork from Sapiens First's public website, reused for this Sapiens First deck. The website does not declare a public stock license for them. Their credit appears separately in the relevant speaker notes. They were inspected for scripts and external dependencies before inclusion as inert embedded images.

The October 9 revision adds these assets. All source bytes and SHA-256 digests are recorded in `sources.json`; viewing the deck remains offline.

| File | Source and credit | Rights and use |
| --- | --- | --- |
| `homepage-hero-photo.jpg` | [Sapiens First homepage](https://sapiensfirst.org/) | Website background reused at the user's request. The current homepage gives no photographer or independent license; underlying rights remain unverified. |
| `march-on-washington.jpg` | [U.S. Information Agency / NARA 542045](https://docsteach.org/document/civil-rights-march-washington-dc/) | The official record marks this exact photograph public domain. A high-resolution JPEG comes from the Wikimedia mirror. It differs from the supplied root photo, whose source was not established. |
| `birmingham-dogs.png` | [Bill Hudson / Associated Press](https://high.org/collection/police-dog-attack-birmingham-alabama/) | Copyrighted 1963 photograph, supplied by the user as an RR Auction scan for this draft. Reuse permission is unverified; the watermark is retained. |
| `napalm-girl.png` | [The Terror of War / Associated Press](https://www.ap.org/about/ap-report-terror-of-war/) | Copyrighted June 8, 1972 photograph supplied by the user. AP credits Nick Ut; attribution is disputed. Reuse permission is unverified. |

The two AP photographs are included in the local draft with their rights status in the presenter notes. They are not declared public domain. The root-level `dogs.png` and `napalm girl.png` were byte-identical (SHA-256 verified) to `birmingham-dogs.png` and `napalm-girl.png` and were removed from the repo root. The root `march on washington.png` (1920x1460, a different photograph from the Lincoln Memorial showing chairs in the foreground) is not a copy of `march-on-washington.jpg`; its source and licence are unverified, it is unused by the deck, and it was left in place. The March image illustrates historical mass mobilization and does not establish the source's 3.5% claim.

Revision 2 adds `crossroads.svg`, an original vector illustration of a road dividing toward storm clouds and sunrise, with no text or people. It has no third-party source image. `sources.json` records its SHA-256 digest. The Declaration asset is retired with its bridge slide; the public-domain March image remains on the participation-threshold slide.
