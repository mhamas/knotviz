# Use Cases

Real-world examples of graph visualization with KnotViz, organized by audience.

---

## Technical

### 1. Dependency Graphs (Software / Packages)
npm/PyPI package dependencies. Each node is a package, edges are "depends on". Properties: `downloads` (number), `license` (string ~15 values), `last_published` (date), `is_deprecated` (boolean). Color by license type to spot GPL contamination. Filter by `is_deprecated=true` to find risky dependencies. Max incoming degree reveals which packages are the most depended-upon (and thus highest-risk if compromised).

### 2. Infrastructure & Microservice Maps
A company's 500 microservices and their API call relationships. Properties: `team` (string ~20 values), `error_rate` (number), `last_deploy` (date), `is_critical` (boolean). Color by team ownership to see boundaries. Filter to `error_rate > 5%` to isolate unhealthy services. High outgoing degree = services with too many downstream dependencies (candidates for decoupling).

### 3. Knowledge Graphs / Ontologies
A medical ontology where nodes are concepts (diseases, symptoms, drugs) and edges are relationships (causes, treats, contraindicates). Properties: `type` (string ~10 values: disease/symptom/drug), `severity` (number), `approved_date` (date). Color by type, filter to a specific disease cluster. The directed edges show causality chains.

### 4. Social / Organizational Networks
Internal company communication graph — who messages whom on Slack. Properties: `department` (string ~30 values), `tenure_years` (number), `is_manager` (boolean), `start_date` (date). Color by department to see cross-team communication patterns. Max outgoing/incoming sliders reveal the most prolific communicators vs. information sinks. Useful for org design and identifying silos.

### 5. Web Crawler / Sitemap Analysis
Crawl output where nodes are URLs and edges are hyperlinks. Properties: `status_code` (number), `content_type` (string ~10 values), `last_crawled` (date), `is_indexed` (boolean). Color by status code to spot broken link clusters. Filter `is_indexed=false` to find orphan pages. Edge directionality shows link equity flow — critical for SEO audits.

### 6. Financial Transaction Networks
Accounts as nodes, money transfers as edges (directed). Properties: `account_type` (string: personal/business/exchange), `balance` (number), `kyc_verified` (boolean), `created_at` (date). The edge filtering is powerful here — reduce to top edges by weight (transaction amount) to see the major money flows. Color by `kyc_verified=false` to highlight unverified accounts in high-traffic positions.

---

## General / Non-Technical

### 7. Movie / TV Connections
Actors as nodes, edges connect actors who appeared in the same film. Properties: `genre` (string ~30: action/comedy/drama), `oscar_nominations` (number), `is_active` (boolean), `debut_date` (date). Color by genre to see clusters — action stars vs indie actors. The "six degrees of Kevin Bacon" effect becomes visual. High-degree nodes are the prolific connectors of Hollywood.

### 8. Recipe & Ingredient Networks
Ingredients as nodes, edges connect ingredients that appear together in recipes. Properties: `cuisine` (string ~50: Italian/Thai/Mexican), `calories_per_100g` (number), `is_allergen` (boolean), `season` (string: spring/summer/fall/winter). Color by cuisine to discover which ingredients are uniquely Italian vs universally used. Filter `is_allergen=true` to see how central common allergens are to different cuisines.

### 9. Flight Route Maps
Airports as nodes, direct flights as edges. Properties: `country` (string ~200), `annual_passengers` (number), `is_hub` (boolean), `opened_date` (date). Color by country, filter to a single airline's routes. Max outgoing slider reveals which airports are the biggest hubs. Drop edge percentage to see only the busiest routes — the backbone of global air travel emerges.

### 10. Sports Team Trades & Transfers
Football/soccer clubs as nodes, player transfers as directed edges (from to). Properties: `league` (string ~20: Premier League/La Liga/Serie A), `transfer_budget` (number), `founded` (date), `is_national_team` (boolean). Edge weights = transfer fees. Filter to top 10% of edges by weight to see where the big money flows. Color by league to see cross-league transfer patterns.

### 11. Music Collaboration Networks
Artists as nodes, edges connect artists who collaborated on a track. Properties: `genre` (string ~50: hip-hop/pop/country/electronic), `monthly_listeners` (number), `is_solo_artist` (boolean), `first_release` (date). Color by genre — you'll see genre-crossing bridges (the artists who connect hip-hop to pop). Filter to `monthly_listeners > 1M` to see only the mainstream collaboration web.

### 12. Disease Spread / Contact Tracing
People as nodes, "was in contact with" as directed edges (who infected whom). Properties: `age_group` (string: 0-18/19-35/36-55/56+), `days_to_symptoms` (number), `is_vaccinated` (boolean), `test_date` (date). Color by age group, filter `is_vaccinated=false`. High outgoing degree = super-spreaders. The directed arrows show transmission chains.

### 13. Company Supply Chains
Companies as nodes, "supplies to" as directed edges. Properties: `industry` (string ~40: automotive/electronics/food), `revenue` (number), `is_public` (boolean), `founded` (date). Drop edge percentage to see only the critical supply relationships. A single node with high incoming degree that isn't public? That's a hidden single point of failure in the supply chain.

### 14. Family Trees / Genealogy
People as nodes, parent-to-child as directed edges. Properties: `birth_country` (string), `birth_year` (number), `is_living` (boolean), `birth_date` (date). Color by birth country to see migration patterns across generations. The directed edges naturally show lineage flow. Works with genealogy datasets from sites like Ancestry or FamilySearch.
