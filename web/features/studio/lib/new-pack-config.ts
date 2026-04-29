'use client';

export type PackTheme =
  | 'post_apocalyptic'
  | 'cyberpunk'
  | 'modern_city'
  | 'sci_fi'
  | 'medieval'
  | 'cozy_fantasy'
  | 'horror'
  | 'retro'
  | 'industrial'
  | 'desert'
  | 'forest'
  | 'snow'
  | 'steampunk'
  | 'dieselpunk'
  | 'space_station'
  | 'underwater'
  | 'tropical'
  | 'volcanic'
  | 'western'
  | 'pirate'
  | 'gothic'
  | 'brutalist'
  | 'victorian'
  | 'japanese_retro'
  | 'shrine_temple'
  | 'arabian'
  | 'ancient_ruins'
  | 'toybox'
  | 'arcade'
  | 'military';

export type PackType =
  | 'street_props'
  | 'interior_props'
  | 'market_props'
  | 'industrial_props'
  | 'vehicles'
  | 'weapons_gear'
  | 'nature_items'
  | 'ruins_debris'
  | 'signs_lighting'
  | 'furniture_decor'
  | 'sci_fi_devices'
  | 'building_pieces'
  | 'food_kitchen'
  | 'office_studio'
  | 'medical_lab'
  | 'sewer_utility'
  | 'docks_fishing'
  | 'farm_rural'
  | 'desert_camp'
  | 'military_base'
  | 'shrine_relics'
  | 'magic_items'
  | 'dungeon_traps'
  | 'robots_drones'
  | 'retail_store'
  | 'transit_station'
  | 'construction_site'
  | 'park_playground'
  | 'snow_arctic_gear'
  | 'festival_decor'
  | 'containers_storage'
  | 'rooftop_hvac'
  | 'bathroom_laundry'
  | 'classroom_library'
  | 'music_stage'
  | 'graveyard_funerary'
  | 'cave_crystals'
  | 'space_cargo'
  | 'mech_parts'
  | 'prison_security'
  | 'casino_lounge'
  | 'sports_recreation'
  | 'temple_garden'
  | 'office_security'
  | 'power_plant'
  | 'junkyard_scrap'
  | 'camping_outdoor'
  | 'suburban_home'
  | 'small_boats'
  | 'airfield_hangar';
export type PackStyle = 'low_poly' | 'voxel';
export type PackAssetCount = 3 | 4 | 5 | 6 | 7 | 8;

export type PackThemeOption = {
  id: PackTheme;
  label: string;
  description: string;
  prompt: string;
  group: string;
  thumbnailSrc?: string;
};

export type PackTypeOption = {
  id: PackType;
  label: string;
  description: string;
  prompt: string;
  group: string;
  thumbnailSrc: string;
};

const buildPackTypeThumbnailSrc = (id: PackType) => `/studio/pack-type-thumbnails/${id}.svg`;

export type PackStyleOption = {
  id: PackStyle;
  label: string;
  description: string;
  prompt: string;
};

export type PackPreset = {
  id: string;
  title: string;
  theme: PackTheme;
  packType: PackType;
  style: PackStyle;
  assetCount: PackAssetCount;
  notes: string;
};

export const PACK_THEME_OPTIONS: Array<PackThemeOption> = [
  {
    id: 'post_apocalyptic',
    label: 'Post-apocalyptic',
    description: 'Worn, dusty, damaged world',
    group: 'Genre and Mood',
    prompt: 'post-apocalyptic, worn, damaged, dusty, muted colors, survival-game mood',
    thumbnailSrc: '/studio/theme-thumbnails/post-apocalyptic.svg',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Neon, dense, high-tech decay',
    group: 'Sci-fi and Futuristic',
    prompt: 'cyberpunk, neon accents, dense urban detail, gritty futurism, readable sci-fi shapes',
    thumbnailSrc: '/studio/theme-thumbnails/cyberpunk.svg',
  },
  {
    id: 'modern_city',
    label: 'Modern city',
    description: 'Contemporary urban scenes',
    group: 'Modern and Urban',
    prompt: 'modern city, contemporary urban details, clean public spaces, practical everyday objects',
    thumbnailSrc: '/studio/theme-thumbnails/modern-city.svg',
  },
  {
    id: 'sci_fi',
    label: 'Sci-fi',
    description: 'Clean or rugged future tech',
    group: 'Sci-fi and Futuristic',
    prompt: 'sci-fi, futuristic materials, readable technology shapes, game-ready hard-surface forms',
    thumbnailSrc: '/studio/theme-thumbnails/sci-fi.svg',
  },
  {
    id: 'medieval',
    label: 'Medieval',
    description: 'Handmade, rustic, grounded fantasy',
    group: 'Fantasy and Historical',
    prompt: 'medieval, handmade materials, rustic details, grounded fantasy, timber and stone',
    thumbnailSrc: '/studio/theme-thumbnails/medieval.svg',
  },
  {
    id: 'cozy_fantasy',
    label: 'Cozy fantasy',
    description: 'Warm, simple, inviting',
    group: 'Fantasy and Historical',
    prompt: 'cozy fantasy, warm mood, soft stylization, inviting shapes, simple charming details',
    thumbnailSrc: '/studio/theme-thumbnails/cozy-fantasy.svg',
  },
  {
    id: 'horror',
    label: 'Horror',
    description: 'Tense, eerie, unsettling',
    group: 'Genre and Mood',
    prompt: 'horror, eerie mood, unsettling details, worn surfaces, readable silhouettes with ominous tone',
    thumbnailSrc: '/studio/theme-thumbnails/horror.svg',
  },
  {
    id: 'retro',
    label: 'Retro',
    description: 'Old-school, nostalgic style',
    group: 'Stylized and Playful',
    prompt: 'retro, nostalgic shapes, vintage details, old-school game mood, readable simplified forms',
    thumbnailSrc: '/studio/theme-thumbnails/retro.svg',
  },
  {
    id: 'industrial',
    label: 'Industrial',
    description: 'Heavy machinery and utility spaces',
    group: 'Modern and Urban',
    prompt: 'industrial, heavy-duty materials, maintenance areas, practical utility details, robust shapes',
    thumbnailSrc: '/studio/theme-thumbnails/industrial.svg',
  },
  {
    id: 'desert',
    label: 'Desert',
    description: 'Dry, sun-bleached environments',
    group: 'Nature and Environment',
    prompt: 'desert, sun-bleached materials, dusty weathering, dry environment details, strong silhouettes',
    thumbnailSrc: '/studio/theme-thumbnails/desert.svg',
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Natural, overgrown, organic',
    group: 'Nature and Environment',
    prompt: 'forest, natural materials, overgrown details, organic shapes, grounded outdoor mood',
    thumbnailSrc: '/studio/theme-thumbnails/forest.svg',
  },
  {
    id: 'snow',
    label: 'Snow and ice',
    description: 'Cold, frosty, winter scenes',
    group: 'Nature and Environment',
    prompt: 'snow and ice, cold climate details, frosty materials, winter mood, readable layered forms',
    thumbnailSrc: '/studio/theme-thumbnails/snow.svg',
  },
  {
    id: 'steampunk',
    label: 'Steampunk',
    description: 'Brass, pipes, clockwork inventions',
    group: 'Sci-fi and Futuristic',
    prompt: 'steampunk, brass materials, exposed pipes, gears, clockwork details, adventurous retro-futurism',
    thumbnailSrc: '/studio/theme-thumbnails/steampunk.svg',
  },
  {
    id: 'dieselpunk',
    label: 'Dieselpunk',
    description: 'Heavy machinery and smoky retro industry',
    group: 'Sci-fi and Futuristic',
    prompt: 'dieselpunk, heavy industrial retro-futurism, smoky atmosphere, riveted metal, robust mechanical forms',
    thumbnailSrc: '/studio/theme-thumbnails/dieselpunk.svg',
  },
  {
    id: 'space_station',
    label: 'Space station',
    description: 'Modular futuristic interiors and equipment',
    group: 'Sci-fi and Futuristic',
    prompt: 'space station, modular futuristic construction, utilitarian sci-fi details, clean panels, readable hard-surface forms',
    thumbnailSrc: '/studio/theme-thumbnails/space-station.svg',
  },
  {
    id: 'underwater',
    label: 'Underwater',
    description: 'Submerged structures and aquatic mood',
    group: 'Nature and Environment',
    prompt: 'underwater, aquatic atmosphere, submerged materials, marine details, layered organic and structural shapes',
    thumbnailSrc: '/studio/theme-thumbnails/underwater.svg',
  },
  {
    id: 'tropical',
    label: 'Tropical',
    description: 'Lush, humid, colorful outdoor scenes',
    group: 'Nature and Environment',
    prompt: 'tropical, lush vegetation, humid climate details, bright natural materials, relaxed outdoor mood',
    thumbnailSrc: '/studio/theme-thumbnails/tropical.svg',
  },
  {
    id: 'volcanic',
    label: 'Volcanic',
    description: 'Ash, lava, scorched environments',
    group: 'Nature and Environment',
    prompt: 'volcanic, scorched materials, lava glow, ash-covered surfaces, harsh dramatic environment details',
    thumbnailSrc: '/studio/theme-thumbnails/volcanic.svg',
  },
  {
    id: 'western',
    label: 'Western',
    description: 'Frontier towns and dusty outposts',
    group: 'Fantasy and Historical',
    prompt: 'western frontier, dusty roads, timber buildings, rustic props, old-town silhouettes and frontier mood',
    thumbnailSrc: '/studio/theme-thumbnails/western.svg',
  },
  {
    id: 'pirate',
    label: 'Pirate',
    description: 'Seafaring adventure and worn wood',
    group: 'Fantasy and Historical',
    prompt: 'pirate adventure, weathered wood, rope details, seafaring props, rugged nautical atmosphere',
    thumbnailSrc: '/studio/theme-thumbnails/pirate.svg',
  },
  {
    id: 'gothic',
    label: 'Gothic',
    description: 'Dark stonework and ornate atmosphere',
    group: 'Fantasy and Historical',
    prompt: 'gothic, ornate stonework, dark dramatic mood, pointed forms, old-world detail and moody silhouettes',
    thumbnailSrc: '/studio/theme-thumbnails/gothic.svg',
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    description: 'Raw concrete and heavy urban forms',
    group: 'Modern and Urban',
    prompt: 'brutalist, raw concrete, heavy geometric architecture, stark urban details, strong blocky silhouettes',
    thumbnailSrc: '/studio/theme-thumbnails/brutalist.svg',
  },
  {
    id: 'victorian',
    label: 'Victorian',
    description: 'Decorative historical urban style',
    group: 'Fantasy and Historical',
    prompt: 'victorian, decorative historical details, elegant materials, dense urban ornament, refined period atmosphere',
    thumbnailSrc: '/studio/theme-thumbnails/victorian.svg',
  },
  {
    id: 'japanese_retro',
    label: 'Japanese retro',
    description: 'Showa-era streets and nostalgic signage',
    group: 'Cultural and Regional',
    prompt: 'Japanese retro, nostalgic streetscape, vintage signage, compact urban details, warm old-town mood',
    thumbnailSrc: '/studio/theme-thumbnails/japanese-retro.svg',
  },
  {
    id: 'shrine_temple',
    label: 'Shrine and temple',
    description: 'Sacred architecture and traditional materials',
    group: 'Cultural and Regional',
    prompt: 'shrine and temple, traditional sacred architecture, wood and stone materials, ceremonial details, calm spiritual atmosphere',
    thumbnailSrc: '/studio/theme-thumbnails/shrine-temple.svg',
  },
  {
    id: 'arabian',
    label: 'Arabian',
    description: 'Warm markets, arches, and desert cities',
    group: 'Cultural and Regional',
    prompt: 'Arabian-inspired setting, warm market atmosphere, arches, patterned materials, desert-city detail and rich silhouettes',
    thumbnailSrc: '/studio/theme-thumbnails/arabian.svg',
  },
  {
    id: 'ancient_ruins',
    label: 'Ancient ruins',
    description: 'Forgotten structures and weathered relics',
    group: 'Fantasy and Historical',
    prompt: 'ancient ruins, weathered stone, relic details, overgrown decay, mysterious archaeological atmosphere',
    thumbnailSrc: '/studio/theme-thumbnails/ancient-ruins.svg',
  },
  {
    id: 'toybox',
    label: 'Toybox',
    description: 'Playful oversized shapes and bright materials',
    group: 'Stylized and Playful',
    prompt: 'toybox style, playful oversized proportions, bright materials, simplified cheerful forms, imaginative childlike mood',
    thumbnailSrc: '/studio/theme-thumbnails/toybox.svg',
  },
  {
    id: 'arcade',
    label: 'Arcade',
    description: 'Bright machines, neon, and playful interiors',
    group: 'Stylized and Playful',
    prompt: 'arcade, bright machines, playful neon details, glossy surfaces, energetic entertainment-space mood',
    thumbnailSrc: '/studio/theme-thumbnails/arcade.svg',
  },
  {
    id: 'military',
    label: 'Military',
    description: 'Tactical equipment and utilitarian structures',
    group: 'Genre and Mood',
    prompt: 'military, tactical utility details, rugged materials, practical equipment, disciplined functional silhouettes',
    thumbnailSrc: '/studio/theme-thumbnails/military.svg',
  },
];

const PACK_TYPE_OPTION_BASES: Array<Omit<PackTypeOption, 'thumbnailSrc'>> = [
  {
    id: 'street_props',
    label: 'Street items',
    description: 'Roadside and outdoor set dressing',
    group: 'Urban and Utility',
    prompt:
      'street props and outdoor set dressing for roads, sidewalks, alleys, corners, or small exterior scenes',
  },
  {
    id: 'interior_props',
    label: 'Room items',
    description: 'Rooms, desks, shelves, decor',
    group: 'Interior and Decor',
    prompt: 'interior props for rooms, workspaces, homes, shops, or compact explorable interiors',
  },
  {
    id: 'market_props',
    label: 'Shop and market items',
    description: 'Stalls, signs, goods, containers',
    group: 'Commerce and Event',
    prompt:
      'market props such as stalls, signs, goods, containers, tables, and small vendor accessories',
  },
  {
    id: 'industrial_props',
    label: 'Industrial items',
    description: 'Machines, barrels, fences, utility items',
    group: 'Urban and Utility',
    prompt:
      'industrial props such as utility items, machines, containers, barriers, pipes, and maintenance objects',
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    description: 'Cars, bikes, carts, small transport',
    group: 'Transport and Transit',
    prompt:
      'vehicle assets such as cars, bikes, carts, wagons, hover vehicles, or small transport props suitable for game scenes',
  },
  {
    id: 'weapons_gear',
    label: 'Weapons and gear',
    description: 'Weapons, armor, tactical equipment',
    group: 'Combat and Security',
    prompt:
      'weapons and gear assets such as swords, shields, rifles, crates, armor pieces, tactical kits, and equipment props',
  },
  {
    id: 'nature_items',
    label: 'Nature items',
    description: 'Trees, rocks, plants, natural set dressing',
    group: 'Nature and Outdoor',
    prompt:
      'nature assets such as trees, rocks, shrubs, mushrooms, logs, roots, and small natural environment props',
  },
  {
    id: 'ruins_debris',
    label: 'Ruins and debris',
    description: 'Broken masonry, wreckage, scatter',
    group: 'Nature and Outdoor',
    prompt:
      'ruins and debris assets such as broken walls, rubble, collapsed pieces, wreckage, cracked stone, and scattered environment fragments',
  },
  {
    id: 'signs_lighting',
    label: 'Signs and lighting',
    description: 'Signs, lamps, fixtures, poles',
    group: 'Urban and Utility',
    prompt:
      'signage and lighting assets such as signs, street lamps, hanging lights, lanterns, neon fixtures, poles, and illuminated props',
  },
  {
    id: 'furniture_decor',
    label: 'Furniture and decor',
    description: 'Tables, chairs, shelves, decorative pieces',
    group: 'Interior and Decor',
    prompt:
      'furniture and decor assets such as tables, chairs, shelves, cabinets, rugs, frames, lamps, and decorative interior props',
  },
  {
    id: 'sci_fi_devices',
    label: 'Sci-fi devices',
    description: 'Consoles, terminals, drones, tech props',
    group: 'Sci-fi and Advanced Tech',
    prompt:
      'sci-fi device assets such as consoles, terminals, control panels, drones, pods, batteries, and futuristic utility props',
  },
  {
    id: 'building_pieces',
    label: 'Building pieces',
    description: 'Walls, doors, windows, floors, modular parts',
    group: 'Architecture and Structural',
    prompt:
      'building piece assets such as walls, doors, windows, roof parts, floor tiles, stairs, arches, and modular construction pieces',
  },
  {
    id: 'food_kitchen',
    label: 'Food and kitchen items',
    description: 'Cookware, dishes, food props, kitchen tools',
    group: 'Interior and Decor',
    prompt:
      'food and kitchen assets such as cookware, dishes, utensils, bottles, food props, cutting boards, ovens, and compact kitchen set dressing',
  },
  {
    id: 'office_studio',
    label: 'Office and studio items',
    description: 'Desks, monitors, storage, work tools',
    group: 'Interior and Decor',
    prompt:
      'office and studio assets such as desks, monitors, chairs, shelves, notebooks, tablets, microphones, cameras, and workspace props',
  },
  {
    id: 'medical_lab',
    label: 'Medical and lab items',
    description: 'Beds, carts, lab benches, medical equipment',
    group: 'Sci-fi and Advanced Tech',
    prompt:
      'medical and lab assets such as carts, beds, cabinets, monitors, lab benches, microscopes, canisters, and clinical utility props',
  },
  {
    id: 'sewer_utility',
    label: 'Sewer and utility items',
    description: 'Pipes, valves, drains, maintenance props',
    group: 'Urban and Utility',
    prompt:
      'sewer and utility assets such as pipes, valves, drains, pumps, grates, maintenance ladders, control boxes, and underground service props',
  },
  {
    id: 'docks_fishing',
    label: 'Docks and fishing items',
    description: 'Piers, nets, buoys, crates, harbor props',
    group: 'Nature and Outdoor',
    prompt:
      'dock and fishing assets such as nets, buoys, ropes, crates, barrels, pier props, hooks, baskets, and small harbor set dressing',
  },
  {
    id: 'farm_rural',
    label: 'Farm and rural items',
    description: 'Tools, fencing, carts, barn props',
    group: 'Nature and Outdoor',
    prompt:
      'farm and rural assets such as fencing, carts, hay bales, buckets, troughs, tools, barn clutter, and countryside utility props',
  },
  {
    id: 'desert_camp',
    label: 'Desert camp items',
    description: 'Tents, crates, supplies, camp gear',
    group: 'Nature and Outdoor',
    prompt:
      'desert camp assets such as tents, crates, lanterns, cloth shades, water containers, camp tables, supply bundles, and expedition props',
  },
  {
    id: 'military_base',
    label: 'Military base items',
    description: 'Barricades, crates, antennas, fortification props',
    group: 'Combat and Security',
    prompt:
      'military base assets such as barricades, crates, antennas, sandbags, watch equipment, utility cases, field tents, and fortified props',
  },
  {
    id: 'shrine_relics',
    label: 'Shrine and relic items',
    description: 'Offerings, lanterns, statues, ceremonial props',
    group: 'Fantasy and Historical',
    prompt:
      'shrine and relic assets such as lanterns, offering tables, statues, plaques, incense holders, ceremonial ropes, and sacred decorative props',
  },
  {
    id: 'magic_items',
    label: 'Magic items',
    description: 'Potions, spell books, crystals, ritual props',
    group: 'Fantasy and Historical',
    prompt:
      'magic item assets such as potions, spell books, crystals, ritual candles, staffs, rune stones, magical containers, and arcane props',
  },
  {
    id: 'dungeon_traps',
    label: 'Dungeon traps',
    description: 'Trap props, gates, spikes, puzzle pieces',
    group: 'Fantasy and Historical',
    prompt:
      'dungeon trap assets such as spike traps, gates, levers, pressure plates, chains, cages, puzzle blocks, and dangerous mechanical props',
  },
  {
    id: 'robots_drones',
    label: 'Robots and drones',
    description: 'Bots, drones, helper units, mechanical companions',
    group: 'Sci-fi and Advanced Tech',
    prompt:
      'robot and drone assets such as helper bots, patrol drones, charging pods, maintenance units, compact mechs, and mechanical support props',
  },
  {
    id: 'retail_store',
    label: 'Retail store items',
    description: 'Shelves, displays, counters, checkout props',
    group: 'Commerce and Event',
    prompt:
      'retail store assets such as shelves, display stands, counters, baskets, checkout fixtures, signage, storage bins, and shop props',
  },
  {
    id: 'transit_station',
    label: 'Transit station items',
    description: 'Platforms, benches, kiosks, station props',
    group: 'Transport and Transit',
    prompt:
      'transit station assets such as benches, kiosks, ticket machines, signs, barriers, platform clutter, luggage props, and commuting fixtures',
  },
  {
    id: 'construction_site',
    label: 'Construction site items',
    description: 'Scaffolds, barriers, tools, building materials',
    group: 'Architecture and Structural',
    prompt:
      'construction site assets such as scaffolds, barriers, cones, toolboxes, pallets, cement bags, temporary fencing, and worksite props',
  },
  {
    id: 'park_playground',
    label: 'Park and playground items',
    description: 'Benches, swings, slides, public park props',
    group: 'Nature and Outdoor',
    prompt:
      'park and playground assets such as benches, swings, slides, bins, lamps, planters, public signs, and outdoor leisure props',
  },
  {
    id: 'snow_arctic_gear',
    label: 'Snow and arctic gear',
    description: 'Shelters, sleds, heaters, cold-weather props',
    group: 'Nature and Outdoor',
    prompt:
      'snow and arctic assets such as sleds, heaters, insulated crates, snow shelters, gear racks, fuel cans, and cold-weather survival props',
  },
  {
    id: 'festival_decor',
    label: 'Festival decor',
    description: 'Banners, lights, booths, event decorations',
    group: 'Commerce and Event',
    prompt:
      'festival decor assets such as banners, lantern strings, booths, stages, decorative poles, event signage, celebratory props, and crowd dressing',
  },
  {
    id: 'containers_storage',
    label: 'Containers and storage',
    description: 'Boxes, shelves, bins, stacked storage props',
    group: 'Urban and Utility',
    prompt:
      'container and storage assets such as boxes, shelves, bins, trunks, stacked crates, lockers, and practical storage props',
  },
  {
    id: 'rooftop_hvac',
    label: 'Rooftop and HVAC items',
    description: 'Fans, ducts, vents, roof utility props',
    group: 'Architecture and Structural',
    prompt:
      'rooftop and HVAC assets such as vents, ducts, fans, access units, ladders, railings, and practical rooftop utility props',
  },
  {
    id: 'bathroom_laundry',
    label: 'Bathroom and laundry items',
    description: 'Sinks, tubs, machines, cleaning props',
    group: 'Interior and Decor',
    prompt:
      'bathroom and laundry assets such as sinks, tubs, mirrors, washing machines, baskets, towels, and compact cleaning area props',
  },
  {
    id: 'classroom_library',
    label: 'Classroom and library items',
    description: 'Desks, bookshelves, study props',
    group: 'Interior and Decor',
    prompt:
      'classroom and library assets such as desks, chairs, bookshelves, lecterns, carts, study lamps, and educational interior props',
  },
  {
    id: 'music_stage',
    label: 'Music and stage items',
    description: 'Speakers, stands, instruments, stage props',
    group: 'Commerce and Event',
    prompt:
      'music and stage assets such as speakers, mic stands, amplifiers, cables, instruments, risers, and compact performance props',
  },
  {
    id: 'graveyard_funerary',
    label: 'Graveyard and funerary items',
    description: 'Headstones, crosses, candles, memorial props',
    group: 'Fantasy and Historical',
    prompt:
      'graveyard and funerary assets such as headstones, crosses, memorial plaques, candles, fences, urns, and somber burial props',
  },
  {
    id: 'cave_crystals',
    label: 'Cave and crystal items',
    description: 'Rocks, crystals, stalagmites, cave scatter',
    group: 'Nature and Outdoor',
    prompt:
      'cave and crystal assets such as crystal clusters, stalagmites, rock piles, cave plants, mushrooms, and underground natural props',
  },
  {
    id: 'space_cargo',
    label: 'Space cargo items',
    description: 'Cargo crates, pods, freight utility props',
    group: 'Sci-fi and Advanced Tech',
    prompt:
      'space cargo assets such as freight crates, cargo pods, pallet drones, sealed containers, loading fixtures, and modular storage props',
  },
  {
    id: 'mech_parts',
    label: 'Mech parts',
    description: 'Mechanical limbs, armor plates, repair parts',
    group: 'Sci-fi and Advanced Tech',
    prompt:
      'mech part assets such as armor plates, limbs, joints, repair racks, spare components, and hard-surface machine pieces',
  },
  {
    id: 'prison_security',
    label: 'Prison and security items',
    description: 'Bars, gates, cameras, security fixtures',
    group: 'Combat and Security',
    prompt:
      'prison and security assets such as bars, gates, cameras, locked doors, warning signs, control boxes, and secure facility props',
  },
  {
    id: 'casino_lounge',
    label: 'Casino and lounge items',
    description: 'Tables, stools, counters, entertainment decor',
    group: 'Commerce and Event',
    prompt:
      'casino and lounge assets such as tables, stools, counters, lamps, display fixtures, gaming props, and nightlife decor',
  },
  {
    id: 'sports_recreation',
    label: 'Sports and recreation items',
    description: 'Court props, gym equipment, leisure fixtures',
    group: 'Nature and Outdoor',
    prompt:
      'sports and recreation assets such as benches, racks, court props, gym items, scoreboards, leisure fixtures, and activity set dressing',
  },
  {
    id: 'temple_garden',
    label: 'Temple and garden items',
    description: 'Stone paths, lanterns, basins, garden props',
    group: 'Fantasy and Historical',
    prompt:
      'temple and garden assets such as stone lanterns, paths, basins, fences, ornaments, garden rocks, and calm ceremonial props',
  },
  {
    id: 'office_security',
    label: 'Office security items',
    description: 'Badge gates, cameras, barriers, checkpoint props',
    group: 'Combat and Security',
    prompt:
      'office security assets such as badge gates, cameras, barrier posts, scanners, control desks, and modern checkpoint props',
  },
  {
    id: 'power_plant',
    label: 'Power plant items',
    description: 'Generators, coils, transformers, grid utility props',
    group: 'Urban and Utility',
    prompt:
      'power plant assets such as generators, transformers, coils, control cabinets, warning barriers, and industrial energy props',
  },
  {
    id: 'junkyard_scrap',
    label: 'Junkyard and scrap items',
    description: 'Scrap piles, wreckage, tires, salvage props',
    group: 'Nature and Outdoor',
    prompt:
      'junkyard and scrap assets such as wreckage, scrap piles, tires, crushed panels, salvage racks, and discarded mechanical props',
  },
  {
    id: 'camping_outdoor',
    label: 'Camping and outdoor gear',
    description: 'Tents, packs, fire pits, trail props',
    group: 'Nature and Outdoor',
    prompt:
      'camping and outdoor assets such as tents, backpacks, fire pits, foldable stools, lanterns, coolers, and trail-side gear props',
  },
  {
    id: 'suburban_home',
    label: 'Suburban home items',
    description: 'Mailboxes, lawn decor, garage clutter',
    group: 'Interior and Decor',
    prompt:
      'suburban home assets such as mailboxes, lawn decor, trash bins, garage clutter, patio furniture, and residential everyday props',
  },
  {
    id: 'small_boats',
    label: 'Small boats',
    description: 'Rowboats, skiffs, small watercraft props',
    group: 'Transport and Transit',
    prompt:
      'small boat assets such as rowboats, skiffs, dinghies, paddles, mooring props, and compact watercraft suitable for game scenes',
  },
  {
    id: 'airfield_hangar',
    label: 'Airfield and hangar items',
    description: 'Service carts, ladders, hangar utility props',
    group: 'Transport and Transit',
    prompt:
      'airfield and hangar assets such as service carts, ladders, cones, fuel drums, maintenance stands, and practical aviation support props',
  },
];

export const PACK_TYPE_OPTIONS: Array<PackTypeOption> = PACK_TYPE_OPTION_BASES.map((option) => ({
  ...option,
  thumbnailSrc: buildPackTypeThumbnailSrc(option.id),
}));

export const PACK_STYLE_OPTIONS: Array<PackStyleOption> = [
  {
    id: 'low_poly',
    label: 'Low-poly',
    description: 'Stylized, readable, old-school 3D',
    prompt: 'low-poly, stylized, readable silhouettes, simple geometry, game-ready proportions',
  },
  {
    id: 'voxel',
    label: 'Voxel',
    description: 'Blocky, chunky, modular',
    prompt: 'voxel style, blocky forms, modular readable shapes, game-ready asset proportions',
  },
];

export const PACK_ASSET_COUNT_OPTIONS: Array<PackAssetCount> = [3, 4, 5, 6, 7, 8];

export const PACK_PRESETS: Array<PackPreset> = [
  {
    id: 'gas_station',
    title: 'Post-apocalyptic gas station',
    theme: 'post_apocalyptic',
    packType: 'street_props',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Include props such as a rusty gas pump, broken car, oil barrel, tire stack, barricade, damaged sign, cracked road piece, or debris pile.',
  },
  {
    id: 'cyberpunk_alley',
    title: 'Cyberpunk alley props',
    theme: 'cyberpunk',
    packType: 'street_props',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Focus on alley props like vending machines, cables, signs, trash bags, crates, barriers, vents, and utility boxes.',
  },
  {
    id: 'medieval_market',
    title: 'Medieval market kit',
    theme: 'medieval',
    packType: 'market_props',
    style: 'low_poly',
    assetCount: 8,
    notes:
      'Focus on stalls, baskets, cloth canopies, crates, barrels, signs, tables, sacks, and merchant props.',
  },
  {
    id: 'cozy_tavern',
    title: 'Cozy tavern interior',
    theme: 'cozy_fantasy',
    packType: 'interior_props',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Focus on interior props like tables, chairs, shelves, mugs, lanterns, barrels, a fireplace, and small decor.',
  },
  {
    id: 'space_station_consoles',
    title: 'Space station consoles',
    theme: 'space_station',
    packType: 'sci_fi_devices',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Focus on modular control consoles, terminals, battery packs, wall panels, small drones, and utility devices for a station corridor.',
  },
  {
    id: 'japanese_retro_signs',
    title: 'Japanese retro sign kit',
    theme: 'japanese_retro',
    packType: 'signs_lighting',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Focus on storefront signs, hanging lamps, wall lights, street poles, menu boards, and compact nostalgic signage.',
  },
  {
    id: 'industrial_factory_floor',
    title: 'Factory floor utility set',
    theme: 'industrial',
    packType: 'industrial_props',
    style: 'low_poly',
    assetCount: 7,
    notes:
      'Include maintenance barrels, pressure tanks, tool carts, safety barriers, pipe junctions, crates, and floor utility props.',
  },
  {
    id: 'forest_ground_cover',
    title: 'Forest ground cover',
    theme: 'forest',
    packType: 'nature_items',
    style: 'low_poly',
    assetCount: 7,
    notes:
      'Focus on rocks, shrubs, mushrooms, roots, fallen logs, stumps, and small plants for game-ready forest set dressing.',
  },
  {
    id: 'desert_camp_supplies',
    title: 'Desert camp supplies',
    theme: 'desert',
    packType: 'desert_camp',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Include tents, water containers, crates, lanterns, rolled fabric, low tables, and expedition supply props.',
  },
  {
    id: 'snow_survival_gear',
    title: 'Snow survival gear',
    theme: 'snow',
    packType: 'snow_arctic_gear',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Focus on sleds, insulated crates, heaters, poles, fuel cans, snow markers, and compact cold-weather camp props.',
  },
  {
    id: 'western_outpost',
    title: 'Western outpost clutter',
    theme: 'western',
    packType: 'street_props',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Include hitching posts, barrels, signboards, crates, water troughs, porch clutter, and dusty roadside props.',
  },
  {
    id: 'gothic_relic_hall',
    title: 'Gothic relic hall',
    theme: 'gothic',
    packType: 'shrine_relics',
    style: 'low_poly',
    assetCount: 5,
    notes:
      'Focus on statues, candle stands, reliquaries, plaques, hanging lamps, and ceremonial stone props with a dark ornate mood.',
  },
  {
    id: 'steampunk_workbench',
    title: 'Steampunk workshop bench',
    theme: 'steampunk',
    packType: 'office_studio',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Include drafting tables, brass instruments, gauges, storage boxes, wall tools, and compact workshop desk props.',
  },
  {
    id: 'pirate_dock_props',
    title: 'Pirate dock props',
    theme: 'pirate',
    packType: 'docks_fishing',
    style: 'low_poly',
    assetCount: 7,
    notes:
      'Focus on rope coils, nets, barrels, fish crates, lanterns, mooring posts, and small dockside clutter.',
  },
  {
    id: 'military_checkpoint',
    title: 'Military checkpoint',
    theme: 'military',
    packType: 'military_base',
    style: 'low_poly',
    assetCount: 7,
    notes:
      'Include barricades, crates, antennas, spotlights, sandbags, road blockers, and compact checkpoint gear.',
  },
  {
    id: 'arcade_corner',
    title: 'Arcade corner props',
    theme: 'arcade',
    packType: 'interior_props',
    style: 'voxel',
    assetCount: 6,
    notes:
      'Focus on arcade cabinets, stools, prize machines, neon wall lights, tokens, and small entertainment corner props.',
  },
  {
    id: 'victorian_parlor',
    title: 'Victorian parlor decor',
    theme: 'victorian',
    packType: 'furniture_decor',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Include sofas, side tables, lamps, frames, cabinets, rugs, and decorative parlor furniture with period detail.',
  },
  {
    id: 'ancient_ruins_scatter',
    title: 'Ancient ruins scatter',
    theme: 'ancient_ruins',
    packType: 'ruins_debris',
    style: 'low_poly',
    assetCount: 7,
    notes:
      'Focus on broken pillars, stone fragments, cracked tablets, toppled relics, rubble piles, and overgrown ruin pieces.',
  },
  {
    id: 'construction_blockout',
    title: 'Construction site blockout',
    theme: 'modern_city',
    packType: 'construction_site',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Include scaffolding, traffic cones, toolboxes, pallets, temporary fencing, cement bags, and worksite clutter.',
  },
  {
    id: 'cozy_kitchen',
    title: 'Cozy kitchen starter set',
    theme: 'cozy_fantasy',
    packType: 'food_kitchen',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Focus on pots, bowls, cutting boards, bottles, bread baskets, hanging utensils, and warm kitchen props.',
  },
  {
    id: 'retail_checkout',
    title: 'Retail checkout set',
    theme: 'modern_city',
    packType: 'retail_store',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Include counters, baskets, display racks, shopping bags, checkout fixtures, and compact convenience store props.',
  },
  {
    id: 'transit_platform',
    title: 'Transit platform kit',
    theme: 'sci_fi',
    packType: 'transit_station',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Focus on benches, kiosks, barriers, luggage carts, signs, and small platform props for a station scene.',
  },
  {
    id: 'magic_apothecary',
    title: 'Magic apothecary shelf',
    theme: 'cozy_fantasy',
    packType: 'magic_items',
    style: 'low_poly',
    assetCount: 6,
    notes:
      'Include potion bottles, spell books, candles, crystals, herb jars, and ritual containers for a readable fantasy shelf set.',
  },
  {
    id: 'robot_maintenance_bay',
    title: 'Robot maintenance bay',
    theme: 'sci_fi',
    packType: 'robots_drones',
    style: 'low_poly',
    assetCount: 5,
    notes:
      'Focus on helper bots, charging pods, spare drone shells, repair arms, and compact maintenance bay props.',
  },
];

export const buildWorkspaceName = (prompt: string) => {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  return normalized.slice(0, 20) || 'Untitled asset pack';
};

export const getPackThemeOption = (theme: PackTheme) =>
  PACK_THEME_OPTIONS.find((option) => option.id === theme) ?? PACK_THEME_OPTIONS[0];

export const getPackTypeOption = (packType: PackType) =>
  PACK_TYPE_OPTIONS.find((option) => option.id === packType) ?? PACK_TYPE_OPTIONS[0];

export const getPackStyleOption = (style: PackStyle) =>
  PACK_STYLE_OPTIONS.find((option) => option.id === style) ?? PACK_STYLE_OPTIONS[0];

export const buildPackSummary = ({
  theme,
  packType,
  style,
  assetCount,
}: {
  theme: PackTheme;
  packType: PackType;
  style: PackStyle;
  assetCount: PackAssetCount;
}) => {
  const themeOption = getPackThemeOption(theme);
  const packTypeOption = getPackTypeOption(packType);
  const styleOption = getPackStyleOption(style);
  return `${themeOption.label} ${packTypeOption.label} (${styleOption.label}, ${assetCount} assets)`;
};

export const buildStructuredPackPrompt = ({
  theme,
  packType,
  style,
  assetCount,
  notes,
}: {
  theme: PackTheme;
  packType: PackType;
  style: PackStyle;
  assetCount: PackAssetCount;
  notes: string;
}) => {
  const themeOption = getPackThemeOption(theme);
  const packTypeOption = getPackTypeOption(packType);
  const styleOption = getPackStyleOption(style);
  const trimmedNotes = notes.trim();

  return [
    `Create a ${styleOption.label.toLowerCase()} game asset pack.`,
    '',
    `Theme: ${themeOption.prompt}.`,
    `Pack focus: ${packTypeOption.prompt}.`,
    `Asset count: generate ${assetCount} separate reusable assets.`,
    '',
    'Requirements:',
    '- Every asset must remain a separate reusable part.',
    '- Do not merge everything into one scene.',
    '- Keep the pack visually cohesive and suitable for game production.',
    `- Style direction: ${styleOption.prompt}.`,
    '- Prioritize clean silhouettes, stable proportions, and game-ready readability.',
    trimmedNotes ? '' : null,
    trimmedNotes ? `Additional direction: ${trimmedNotes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
};

export type StructuredPackPromptSummary = {
  themeLabel: string;
  packTypeLabel: string;
  styleLabel: string;
  assetCount: number | null;
  additionalDirection: string | null;
};

export const parseStructuredPackPrompt = (
  prompt: string | null | undefined,
): StructuredPackPromptSummary | null => {
  if (!prompt) return null;

  const themePrompt = prompt.match(/^Theme:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const packFocusPrompt = prompt.match(/^Pack focus:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const stylePrompt = prompt.match(/^-\s*Style direction:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const additionalDirection =
    prompt.match(/^Additional direction:\s*([\s\S]+)$/m)?.[1]?.trim() ?? null;
  const assetCountMatch = prompt.match(/^Asset count:\s*generate\s+(\d+)\s+separate reusable assets\./m);
  const assetCount = assetCountMatch ? Number.parseInt(assetCountMatch[1], 10) : null;

  if (!themePrompt && !packFocusPrompt && !stylePrompt && assetCount === null) {
    return null;
  }

  const themeOption = PACK_THEME_OPTIONS.find((option) => option.prompt === themePrompt);
  const packTypeOption = PACK_TYPE_OPTIONS.find((option) => option.prompt === packFocusPrompt);
  const styleOption = PACK_STYLE_OPTIONS.find((option) => option.prompt === stylePrompt);

  return {
    themeLabel: themeOption?.label ?? themePrompt ?? 'Unknown',
    packTypeLabel: packTypeOption?.label ?? packFocusPrompt ?? 'Unknown',
    styleLabel: styleOption?.label ?? stylePrompt ?? 'Unknown',
    assetCount,
    additionalDirection,
  };
};
