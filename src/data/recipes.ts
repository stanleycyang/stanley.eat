import type { DishId, DishRecipe } from '@/types/dish';

export const RECIPES: DishRecipe[] = [
  {
    id: 'curry',
    name: 'Japanese Katsu Curry',
    subtitle: 'Crisp panko pork cutlet over velvety aromatic curry & steamed Koshihikari rice',
    shortLabel: 'Katsu Curry',
    emoji: '🍛',
    cuisine: 'Japanese',
    prepTime: '25 min',
    cookTime: '45 min',
    baseServings: 2,
    spiceLevel: 2,
    isHot: true,
    accentColor: '#C87D20',
    description:
      'Shatteringly crisp golden tonkatsu sliced over slow-caramelized Japanese curry studded with tender carrots and potatoes, balanced by glossy Koshihikari rice.',
    vibeTag: 'Rainy-Day Reset',
    fieldNote:
      'Japanese curry is an exercise in balancing starch, sweetness, and spice—blending two boxed roux styles and melting dark chocolate into slowly caramelized onions gets you 95% of a Tokyo curry shop’s depth on a weeknight.',
    pantrySpecs: [
      {
        item: 'Curry Roux',
        brand: 'S&B Golden Curry + House Vermont (50/50)',
        why: 'Golden brings warm roasted spice while Vermont adds mellow apple-honey roundness.',
      },
      {
        item: 'Short-Grain Rice',
        brand: 'Tamaki Gold Koshihikari',
        why: 'Plump, glossy California-grown grains that stay distinct under thick curry.',
      },
      {
        item: 'Breadcrumbs',
        brand: 'Kikkoman Panko',
        why: 'Dry, airy jagged flakes that fry shattering-crisp without soaking up oil.',
      },
    ],
    localSpots: [
      {
        name: 'Curry Hyuga',
        area: 'Cupertino · Burlingame',
        note: 'Ultra-crisp panko tonkatsu paired with deep, slow-simmered dark Japanese curry.',
      },
      {
        name: 'Maji Curry',
        area: 'Cupertino',
        note: 'Tokyo Kanda Curry Grand Prix winner known for rich cheese-topped and katsu plates.',
      },
    ],
    atmosphere: {
      surface: 'ceramic-linen',
      backdropInner: '#FBF7EE',
      backdropOuter: '#EFE5D4',
      keyLightColor: '#FFF3DF',
      keyLightIntensity: 1.55,
      ambientTint: '#F7EFE4',
    },
    parts: [
      {
        id: 'plate',
        label: 'Oval Ceramic Plate',
        description:
          'Warmed cream stoneware oval plate with ample rim space to separate fluffy rice from glossy curry.',
        cameraFocus: {
          target: [0, -0.05, 0],
          position: [0.2, 2.0, 2.9],
        },
      },
      {
        id: 'rice',
        label: 'Koshihikari Rice',
        description:
          'Plump, slightly sweet Japanese short-grain rice steamed until each grain glistens and clings gently.',
        cameraFocus: {
          target: [-0.68, 0.05, 0],
          position: [-2.0, 1.55, 2.1],
        },
      },
      {
        id: 'sauce',
        label: 'Golden Curry Roux',
        description:
          'Deeply caramelized onion curry enriched with grated Fuji apple and dark chocolate for a velvety restaurant sheen.',
        cameraFocus: {
          target: [0.68, 0, 0.05],
          position: [2.1, 1.55, 2.0],
        },
      },
      {
        id: 'veg',
        label: 'Carrots & Potatoes',
        description:
          'Hand-cut rangiri carrots and waxy Yukon Gold potato chunks simmered until tender yet shapely.',
        cameraFocus: {
          target: [0.65, 0.08, -0.1],
          position: [2.0, 1.65, 1.75],
        },
      },
      {
        id: 'katsu',
        label: 'Crispy Pork Tonkatsu',
        description:
          'Juicy scored pork loin coated in coarse panko breadcrumbs and fried to an airy chestnut-gold crunch.',
        cameraFocus: {
          target: [0, 0.12, 0.08],
          position: [0.35, 1.45, 2.35],
        },
      },
    ],
    ingredients: [
      {
        id: 'curry-pork-loin',
        name: 'Boneless pork loin chops',
        amount: 2,
        unit: 'chops',
        note: '~180g each, pounded to 1.5 cm, fat cap scored',
        partId: 'katsu',
      },
      {
        id: 'curry-panko',
        name: 'Coarse Japanese panko breadcrumbs',
        amount: 120,
        unit: 'g',
        note: 'airy flakes for a spiky, golden crunch',
        partId: 'katsu',
      },
      {
        id: 'curry-flour',
        name: 'All-purpose flour',
        amount: 50,
        unit: 'g',
        note: 'for a light dry dredge before egg wash',
        partId: 'katsu',
      },
      {
        id: 'curry-egg',
        name: 'Large egg',
        amount: 1,
        unit: 'whole',
        note: 'beaten with 1 tbsp water for dredging',
        partId: 'katsu',
      },
      {
        id: 'curry-oil',
        name: 'Neutral frying oil',
        amount: null,
        unit: 'for frying',
        note: 'canola or rice bran oil, heated to 175°C',
        partId: 'katsu',
      },
      {
        id: 'curry-rice',
        name: 'Koshihikari short-grain rice',
        amount: 300,
        unit: 'g',
        note: 'rinsed 3 times and soaked 30 min before cooking',
        partId: 'rice',
      },
      {
        id: 'curry-onion',
        name: 'Yellow onions',
        amount: 2,
        unit: 'medium',
        note: 'thinly sliced pole-to-pole for slow caramelization',
        partId: 'sauce',
      },
      {
        id: 'curry-carrot',
        name: 'Carrot',
        amount: 1,
        unit: 'large',
        note: 'cut into 2.5 cm rangiri rolling wedges',
        partId: 'veg',
      },
      {
        id: 'curry-potato',
        name: 'Yukon Gold potatoes',
        amount: 2,
        unit: 'medium',
        note: 'peeled and cut into 3 cm chunks so corners stay intact',
        partId: 'veg',
      },
      {
        id: 'curry-roux',
        name: 'Japanese curry roux blocks',
        amount: 100,
        unit: 'g',
        note: 'medium-hot Golden Curry or Vermont Curry, finely chopped',
        partId: 'sauce',
      },
      {
        id: 'curry-stock',
        name: 'Chicken stock or kombu dashi',
        amount: 750,
        unit: 'ml',
        note: 'warm, for a clean savory backbone',
        partId: 'sauce',
      },
      {
        id: 'curry-apple-choc',
        name: 'Fuji apple & 70% dark chocolate',
        amount: 0.5,
        unit: 'apple',
        note: 'finely grated apple plus 15g dark chocolate & 1 tsp tonkatsu sauce',
        partId: 'sauce',
      },
    ],
    steps: [
      'Rinse the Koshihikari rice until the water turns mostly clear, soak for 30 minutes, then steam with 360 ml fresh water until plump and glossy; keep covered to rest.',
      'Sauté the sliced onions in 1 tbsp oil with a pinch of salt over medium-low heat for 18–20 minutes, stirring often until deeply amber, sweet, and jammy.',
      'Add the rangiri carrots, Yukon Gold potatoes, and finely grated Fuji apple; toss for 2 minutes, pour in the warm stock, bring to a boil, skim any foam, and simmer for 15 minutes until vegetables are just fork-tender.',
      'Drop the heat to low, dissolve the chopped curry roux blocks in a ladle of hot broth before whisking back in, then melt in the 70% dark chocolate and tonkatsu sauce; simmer gently for 8–10 minutes until velvety and spoon-coating.',
      'Season the scored pork chops with salt and black pepper, dust in flour, dip in beaten egg, and press firmly into coarse panko; fry at 175°C (350°F) for 4–5 minutes until deeply chestnut-gold and 63°C internal, then rest for 3 minutes on a wire rack.',
      'Mound warm rice on one side of a pre-warmed oval ceramic plate, ladle the rich curry and vegetables beside it, slice the tonkatsu into 2 cm strips to show its crisp cross-section, and drape across the center line.',
    ],
    stanleysTip:
      'Grate half a crisp Fuji apple and melt two squares of 70% dark chocolate into the curry right after the roux dissolves—the natural fruit pectin builds a silky sheen while the cocoa deepens the roasted spice finish without ever tasting sweet.',
  },
  {
    id: 'pizza',
    name: 'Neapolitan Pepperoni Pizza',
    subtitle: '48-hour cold-fermented crust with crushed San Marzano tomatoes & charred pepperoni cups',
    shortLabel: 'Pepperoni Pizza',
    emoji: '🍕',
    cuisine: 'Italian',
    prepTime: '30 min (+ 48 hr ferment)',
    cookTime: '8 min',
    baseServings: 2,
    spiceLevel: 2,
    isHot: false,
    accentColor: '#C83E2B',
    description:
      'Blistered, leopard-spotted Neapolitan dough topped with raw hand-crushed San Marzano tomatoes, creamy fior di latte, crisp curling pepperoni cups, and fragrant sweet basil.',
    vibeTag: 'Friday Ship Reward',
    fieldNote:
      'A home oven maxes out around 290°C, so you win on hydration, fermentation, and thermal mass: 48 hours at 4°C builds complex flavor while a preheated baking steel plus a 90-second broiler blast recreates blistering Neapolitan char.',
    pantrySpecs: [
      {
        item: 'Pizza Flour',
        brand: 'Caputo "00" Pizzeria',
        why: 'Finely milled Italian wheat built for long cold ferments and lacy, blistered rims.',
      },
      {
        item: 'Crushed Tomatoes',
        brand: 'Bianco DiNapoli or Mutti San Marzano',
        why: 'Clean, bright tomato acidity that tastes vibrant raw without pre-cooking.',
      },
      {
        item: 'Pepperoni',
        brand: 'Ezzo or Hormel Cup & Char',
        why: 'Natural-casing links sliced thick enough to curl into crispy oil-catching cups.',
      },
    ],
    localSpots: [
      {
        name: 'Terún',
        area: 'Palo Alto',
        note: 'Wood-fired Southern Italian pies with airy blistered cornicione and bright San Marzano sauce.',
      },
      {
        name: "Tony's Pizza Napoletana",
        area: 'San Francisco',
        note: 'World-champion pies across every oven style—blistered Neapolitan crusts and cup pepperoni that never miss.',
      },
    ],
    atmosphere: {
      surface: 'wood-peel',
      backdropInner: '#FBF6EE',
      backdropOuter: '#EFE4D3',
      keyLightColor: '#FFF1DB',
      keyLightIntensity: 1.6,
      ambientTint: '#F6EDE1',
    },
    parts: [
      {
        id: 'crust',
        label: 'Blistered Neapolitan Crust',
        description:
          'Airy 65%-hydration Type "00" dough cold-fermented for 48 hours and baked hot for leopard-charred edges.',
        cameraFocus: {
          target: [-0.55, -0.15, 0.25],
          position: [-2.1, 1.5, 2.2],
        },
      },
      {
        id: 'sauce',
        label: 'San Marzano Tomato Sauce',
        description:
          'Uncooked hand-crushed DOP plum tomatoes seasoned solely with sea salt so their sweet acidity shines.',
        cameraFocus: {
          target: [0.25, -0.12, -0.1],
          position: [1.5, 1.85, 2.0],
        },
      },
      {
        id: 'cheese',
        label: 'Fior di Latte Mozzarella',
        description:
          'Fresh cow-milk mozzarella torn by hand and lightly drained so it melts into milky pools without weeping.',
        cameraFocus: {
          target: [-0.25, -0.08, -0.1],
          position: [-1.45, 1.75, 2.0],
        },
      },
      {
        id: 'pepperoni',
        label: 'Curled Pepperoni Cups',
        description:
          'Natural-casing pepperoni sliced thick enough to cup under high heat, catching crisp pools of spiced oil.',
        cameraFocus: {
          target: [0.45, -0.05, 0.35],
          position: [1.75, 1.5, 2.25],
        },
      },
      {
        id: 'basil',
        label: 'Fresh Sweet Basil',
        description:
          'Whole tender Genovese basil leaves scattered right out of the oven for an aromatic herbal lift.',
        cameraFocus: {
          target: [0, 0, 0.1],
          position: [0.15, 1.65, 2.25],
        },
      },
    ],
    ingredients: [
      {
        id: 'pizza-flour',
        name: 'Type "00" Neapolitan pizza flour',
        amount: 300,
        unit: 'g',
        note: 'finely milled high-protein flour for extensible dough',
        partId: 'crust',
      },
      {
        id: 'pizza-water',
        name: 'Cold filtered water',
        amount: 195,
        unit: 'ml',
        note: '65% hydration for an open, lacy cornicione',
        partId: 'crust',
      },
      {
        id: 'pizza-salt',
        name: 'Fine sea salt',
        amount: 9,
        unit: 'g',
        note: '7g for the dough, 2g for the raw tomato sauce',
        partId: 'crust',
      },
      {
        id: 'pizza-yeast',
        name: 'Instant dry yeast',
        amount: 0.5,
        unit: 'g',
        note: 'a tiny 1/8 tsp pinch for slow 48-hour cold fermentation',
        partId: 'crust',
      },
      {
        id: 'pizza-tomatoes',
        name: 'Whole peeled San Marzano DOP tomatoes',
        amount: 240,
        unit: 'g',
        note: 'drained slightly and crushed by hand—never blended',
        partId: 'sauce',
      },
      {
        id: 'pizza-mozzarella',
        name: 'Fresh fior di latte mozzarella',
        amount: 170,
        unit: 'g',
        note: 'torn into thumb-sized pieces and blotted dry 30 min',
        partId: 'cheese',
      },
      {
        id: 'pizza-parmigiano',
        name: 'Parmigiano-Reggiano',
        amount: 25,
        unit: 'g',
        note: 'aged 24 months, finely grated for savory depth',
        partId: 'cheese',
      },
      {
        id: 'pizza-pepperoni',
        name: 'Natural-casing cup-and-char pepperoni',
        amount: 75,
        unit: 'g',
        note: 'sliced 2.5 mm thick so edges curl and crisp',
        partId: 'pepperoni',
      },
      {
        id: 'pizza-basil',
        name: 'Fresh sweet Genovese basil',
        amount: 10,
        unit: 'leaves',
        note: 'whole fragrant leaves added immediately after baking',
        partId: 'basil',
      },
      {
        id: 'pizza-evoo',
        name: 'Extra-virgin olive oil',
        amount: 1,
        unit: 'tbsp',
        note: 'drizzled in a fine spiral right before launching',
        partId: 'sauce',
      },
    ],
    steps: [
      'Whisk the yeast into cold water, mix in the Type "00" flour until shaggy, rest for 15 minutes, then knead in 7g sea salt for 8 minutes until elastic; divide into two 250g tight balls, place in lightly oiled sealed containers, and cold-ferment at 4°C for 48 hours.',
      'Bring the dough balls to room temperature for 2 hours before baking; preheat a baking steel or pizza stone on the top rack at 260–290°C (500–550°F) for 60 minutes, or heat a pizza oven deck to 450°C.',
      'Crush the whole San Marzano tomatoes by hand in a bowl with the remaining 2g sea salt so seeds remain unbroken and the sauce stays bright, raw, and clean.',
      'On a semolina-dusted bench, press a dough ball from the center outward while leaving an untouched 2 cm outer rim, then drape gently over your knuckles to stretch into a thin 28 cm round.',
      'Spread 70g crushed tomato sauce in a thin spiral, scatter the blotted fior di latte and grated Parmigiano, arrange the pepperoni slices with breathing room, and finish with a thread of extra-virgin olive oil.',
      'Bake on the scorching steel for 5–7 minutes, switching to the broiler for the final 90 seconds (or 75–90 seconds in a 450°C pizza oven), until the rim blisters with leopard spots and the pepperoni cups char at the edges; scatter fresh sweet basil immediately and slice.',
    ],
    stanleysTip:
      'Cold-ferment the dough for a full 48 hours and blot your torn fior di latte on paper towels for 30 minutes before topping—the slow ferment builds complex toasted-wheat aroma while dry cheese keeps the center crisp instead of soupy.',
  },
  {
    id: 'sushi',
    name: 'Omakase Sushi Platter',
    subtitle: 'Hand-pressed Atlantic salmon & lean tuna nigiri beside crisp avocado-cucumber maki',
    shortLabel: 'Sushi Platter',
    emoji: '🍣',
    cuisine: 'Japanese',
    prepTime: '45 min',
    cookTime: '20 min',
    baseServings: 2,
    spiceLevel: 1,
    isHot: false,
    accentColor: '#D96B52',
    description:
      'An intimate counter-style platter pairing silky Atlantic salmon and ruby lean tuna nigiri with crisp toasted-nori avocado cucumber maki, freshly grated wasabi, and pickled young ginger.',
    vibeTag: 'Sunday Craft',
    fieldNote:
      'Great home sushi comes down to two controllable variables: warm 37°C seasoned rice and clean single-stroke knife cuts on cold fish. Once the shari holds its shape yet breaks apart on contact, every piece sings.',
    pantrySpecs: [
      {
        item: 'Sushi Rice',
        brand: 'Tamaki Gold Short-Grain',
        why: 'Consistent moisture absorption and clean starch sheen for airy hand-pressed shari.',
      },
      {
        item: 'Rice Vinegar',
        brand: 'Marukan Seasoned Rice Vinegar',
        why: 'Balanced mild acidity that brightens fish without overpowering delicate salmon fat.',
      },
      {
        item: 'Soy & Wasabi',
        brand: 'Yamasa Soy Sauce & S&B Hon-Wasabi',
        why: 'Smooth fermented umami paired with crisp, floral heat that wakes up lean tuna.',
      },
    ],
    localSpots: [
      {
        name: 'Sushi Tomi',
        area: 'Mountain View',
        note: 'Beloved Castro Street counter serving generous, razor-fresh nigiri with warm, textbook shari.',
      },
      {
        name: 'Amami Shima Sushi',
        area: 'Cupertino',
        note: 'Clean, meticulous nigiri cuts and seasonal fish in an understated neighborhood dining room.',
      },
    ],
    atmosphere: {
      surface: 'hinoki-cedar',
      backdropInner: '#FAF8F3',
      backdropOuter: '#ECE7DC',
      keyLightColor: '#FFFDF7',
      keyLightIntensity: 1.45,
      ambientTint: '#F3F1EB',
    },
    parts: [
      {
        id: 'board',
        label: 'Hinoki Geta Board',
        description:
          'Unfinished Japanese cypress serving block whose clean grain frames every piece of fish.',
        cameraFocus: {
          target: [0, -0.22, 0],
          position: [-0.4, 1.95, 2.95],
        },
      },
      {
        id: 'salmon-nigiri',
        label: 'Atlantic Salmon Nigiri',
        description:
          'Rich, delicately marbled salmon draped over airy body-temperature shari with a whisper of wasabi.',
        cameraFocus: {
          target: [-0.85, -0.05, 0.08],
          position: [-2.05, 1.35, 2.05],
        },
      },
      {
        id: 'tuna-nigiri',
        label: 'Lean Tuna Nigiri',
        description:
          'Velvety ruby akami tuna brushed lightly with aged soy to highlight its clean mineral finish.',
        cameraFocus: {
          target: [-0.04, -0.05, 0.08],
          position: [-0.25, 1.35, 2.35],
        },
      },
      {
        id: 'maki',
        label: 'Avocado Cucumber Maki',
        description:
          'Crisp toasted Ariake nori rolled snugly around buttery avocado, crunchy cucumber, and toasted sesame.',
        cameraFocus: {
          target: [0.78, 0.02, 0.08],
          position: [2.0, 1.45, 2.05],
        },
      },
      {
        id: 'condiments',
        label: 'Wasabi & Pickled Ginger',
        description:
          'Freshly grated floral wasabi alongside paper-thin gari slices to refresh the palate between bites.',
        cameraFocus: {
          target: [1.05, -0.05, -0.48],
          position: [2.35, 1.35, 1.45],
        },
      },
    ],
    ingredients: [
      {
        id: 'sushi-rice',
        name: 'Japanese short-grain sushi rice',
        amount: 300,
        unit: 'g',
        note: 'rinsed gently 4 times and drained 20 min before cooking',
        partId: 'maki',
      },
      {
        id: 'sushi-vinegar',
        name: 'Seasoned rice vinegar blend',
        amount: 45,
        unit: 'ml',
        note: 'warmed with 15g sugar and 6g sea salt until clear',
        partId: 'maki',
      },
      {
        id: 'sushi-kombu',
        name: 'Dried Rishiri kombu',
        amount: 1,
        unit: 'piece',
        note: '5 cm square, wiped lightly and cooked atop the rice',
        partId: 'maki',
      },
      {
        id: 'sushi-salmon',
        name: 'Sashimi-grade Atlantic salmon loin',
        amount: 140,
        unit: 'g',
        note: 'chilled, sliced at a 45° bias into 6 glossy pieces',
        partId: 'salmon-nigiri',
      },
      {
        id: 'sushi-tuna',
        name: 'Sashimi-grade lean tuna (akami)',
        amount: 140,
        unit: 'g',
        note: 'patted dry, cut into 6 clean 15g rectangular neta',
        partId: 'tuna-nigiri',
      },
      {
        id: 'sushi-nori',
        name: 'Roasted Ariake nori sheets',
        amount: 2,
        unit: 'sheets',
        note: 'waved briefly over low heat for crisp snap',
        partId: 'maki',
      },
      {
        id: 'sushi-avocado',
        name: 'Ripe Hass avocado',
        amount: 0.5,
        unit: 'whole',
        note: 'firm-ripe, cut into neat 1 cm lengthwise batons',
        partId: 'maki',
      },
      {
        id: 'sushi-cucumber',
        name: 'Persian or Japanese cucumber',
        amount: 1,
        unit: 'whole',
        note: 'seeded and sliced into crisp matchsticks',
        partId: 'maki',
      },
      {
        id: 'sushi-sesame',
        name: 'Toasted white sesame seeds',
        amount: 1,
        unit: 'tbsp',
        note: 'sprinkled across the maki rice for nutty warmth',
        partId: 'maki',
      },
      {
        id: 'sushi-wasabi',
        name: 'Freshly grated wasabi',
        amount: 1.5,
        unit: 'tsp',
        note: 'finely grated right before pressing for peak aroma',
        partId: 'condiments',
      },
      {
        id: 'sushi-gari',
        name: 'Pickled young ginger (gari)',
        amount: 30,
        unit: 'g',
        note: 'translucent sweet-tart slices for palate cleansing',
        partId: 'condiments',
      },
      {
        id: 'sushi-shoyu',
        name: 'Japanese brewed soy sauce',
        amount: 2,
        unit: 'tbsp',
        note: 'brushed lightly onto fish or for dipping fish-side down',
        partId: 'condiments',
      },
    ],
    steps: [
      'Cook the drained sushi rice with 330 ml water and the square of kombu for 18 minutes until steamed; discard the kombu, rest for 10 minutes, and turn the hot rice into a damp wide wooden bowl.',
      'Drizzle the warm seasoned vinegar down a wooden paddle across the rice, cutting and folding with slicing motions while fanning briskly for 3 minutes until each grain gleams and cools to body temperature (36–38°C).',
      'Using a razor-sharp knife, slice the chilled salmon and lean akami tuna in one smooth pulling motion—never sawing—into 6 uniform slices of each fish, roughly 7 cm long and 5 mm thick.',
      'Dampen your palms lightly with vinegar water, swipe a pinpoint of wasabi onto the underside of each fish slice, and press an airy 16g oval of warm shari underneath with two light turns so the grains hold together yet dissolve effortlessly.',
      'Place a crisp nori sheet shiny-side down on a bamboo mat, spread an even thin layer of rice leaving a 2 cm top edge, line up avocado, cucumber, and sesame seeds across the center, roll firmly, and cut into 6 neat rounds with a wet blade.',
      'Arrange the salmon nigiri, tuna nigiri, and maki neatly on a hinoki geta board with pickled ginger and grated wasabi at the corner; brush the tuna lightly with soy sauce and serve right away.',
    ],
    stanleysTip:
      'Serve seasoned sushi rice at warm body temperature (around 37°C) beneath cool, lightly chilled fish—that gentle thermal contrast softens the salmon’s rich fat on contact and makes every bite feel straight off a Tokyo counter.',
  },
  {
    id: 'pho',
    name: 'Steaming Beef Pho',
    subtitle: 'Charred ginger & star anise bone broth poured over flat rice noodles & rare beef',
    shortLabel: 'Beef Pho',
    emoji: '🍜',
    cuisine: 'Vietnamese',
    prepTime: '30 min',
    cookTime: '3 hr',
    baseServings: 4,
    spiceLevel: 2,
    isHot: true,
    accentColor: '#9A5B25',
    description:
      'Crystal-clear, deeply aromatic beef bone broth perfumed with open-flame charred ginger, onion, and toasted star anise, ladled piping hot over tender rice noodles and paper-thin rare eye-of-round.',
    vibeTag: 'Late-Night Recharge',
    fieldNote:
      'Clarity and aroma in pho aren’t luck—they’re process. A single 8-minute parboil and scrub strips out the clouding proteins, while charring whole ginger and onion directly over open flame locks in that smoky street-stall backbone.',
    pantrySpecs: [
      {
        item: 'Fish Sauce',
        brand: 'Red Boat 40°N First-Press',
        why: 'Pure black anchovy and sea salt—clean savory depth with zero harsh funk.',
      },
      {
        item: 'Rice Noodles',
        brand: 'Three Ladies Brand Bánh Phở',
        why: 'Silky medium-flat ribbons that hold a tender chew after a quick 15-second blanch.',
      },
      {
        item: 'Whole Spices',
        brand: 'Vietnamese Cassia & Whole Star Anise',
        why: 'Whole bark and star pods stay fragrant through a 3-hour simmer without turning muddy.',
      },
    ],
    localSpots: [
      {
        name: 'Pho Ha Noi',
        area: 'Cupertino · San Jose',
        note: 'Rich, aromatic northern-style beef broth with fresh wide rice noodles and tender brisket.',
      },
      {
        name: 'Pho Vi Hoa',
        area: 'Los Altos',
        note: 'Crystal-clear, deeply spiced beef bone broth that hits the spot on foggy South Bay evenings.',
      },
    ],
    atmosphere: {
      surface: 'hinoki-cedar',
      backdropInner: '#FAF6EE',
      backdropOuter: '#EDE3D3',
      keyLightColor: '#FFF2DC',
      keyLightIntensity: 1.5,
      ambientTint: '#F5ECE0',
    },
    parts: [
      {
        id: 'bowl',
        label: 'Deep Ceramic Bowl',
        description:
          'Pre-warmed stoneware bowl designed to hold abundant steaming broth and lock in spice aromatics.',
        cameraFocus: {
          target: [0, 0, 0],
          position: [0.4, 1.65, 3.05],
        },
      },
      {
        id: 'broth',
        label: 'Charred-Spice Beef Broth',
        description:
          'Clear amber marrow-bone stock gently simmered with fire-charred aromatics, toasted spices, and aged fish sauce.',
        cameraFocus: {
          target: [-0.2, 0.22, 0.1],
          position: [-1.45, 1.9, 2.1],
        },
      },
      {
        id: 'noodles',
        label: 'Flat Rice Noodles',
        description:
          'Silky medium-width bánh phở blanched for seconds so they remain supple with a delicate chew.',
        cameraFocus: {
          target: [0.25, 0.28, 0.15],
          position: [1.55, 1.85, 2.05],
        },
      },
      {
        id: 'beef',
        label: 'Rare Eye-of-Round Beef',
        description:
          'Paper-thin raw slices shaved against the grain that blush rosy-tender the instant hot broth hits the bowl.',
        cameraFocus: {
          target: [-0.35, 0.32, -0.05],
          position: [-1.6, 1.75, 1.95],
        },
      },
      {
        id: 'garnish',
        label: 'Scallions, Star Anise & Lime',
        description:
          'Bright scallion rings, sweet onion slivers, fresh herbs, bird’s-eye chili, and juicy lime squeezed at the table.',
        cameraFocus: {
          target: [0.3, 0.38, -0.05],
          position: [1.55, 1.75, 1.9],
        },
      },
    ],
    ingredients: [
      {
        id: 'pho-bones',
        name: 'Beef marrow & knuckle bones',
        amount: 1500,
        unit: 'g',
        note: 'plus 400g beef brisket for rich body and tenderness',
        partId: 'broth',
      },
      {
        id: 'pho-onions',
        name: 'Yellow onions',
        amount: 2,
        unit: 'medium',
        note: 'halved with skins on for open-flame charring',
        partId: 'broth',
      },
      {
        id: 'pho-ginger',
        name: 'Fresh ginger root',
        amount: 80,
        unit: 'g',
        note: 'halved lengthwise and charred until smoky',
        partId: 'broth',
      },
      {
        id: 'pho-spices',
        name: 'Whole pho spice sachet',
        amount: 1,
        unit: 'bundle',
        note: '4 star anise, 1 Ceylon cinnamon, 5 cloves, 2 black cardamom, 1 tbsp coriander seed',
        partId: 'broth',
      },
      {
        id: 'pho-fish-sauce',
        name: 'Aged Vietnamese fish sauce',
        amount: 60,
        unit: 'ml',
        note: '40°N first-press fish sauce, added in two stages',
        partId: 'broth',
      },
      {
        id: 'pho-rock-sugar',
        name: 'Yellow rock sugar',
        amount: 25,
        unit: 'g',
        note: 'rounds out savory saltiness cleanly',
        partId: 'broth',
      },
      {
        id: 'pho-noodles',
        name: 'Flat dried rice noodles (bánh phở)',
        amount: 400,
        unit: 'g',
        note: '4 mm width, soaked in warm water 30 min until pliable',
        partId: 'noodles',
      },
      {
        id: 'pho-beef',
        name: 'Beef eye-of-round',
        amount: 300,
        unit: 'g',
        note: 'chilled 25 min in freezer, shaved paper-thin against the grain',
        partId: 'beef',
      },
      {
        id: 'pho-scallions',
        name: 'Scallions & sweet white onion',
        amount: 4,
        unit: 'stalks',
        note: 'thinly sliced green rings plus whisper-thin onion crescents',
        partId: 'garnish',
      },
      {
        id: 'pho-herbs',
        name: 'Thai basil & fresh cilantro',
        amount: 1,
        unit: 'bunch',
        note: 'crisp sprigs served fresh alongside',
        partId: 'garnish',
      },
      {
        id: 'pho-limes',
        name: 'Fresh limes',
        amount: 2,
        unit: 'whole',
        note: 'cut into wedges for lively citrus acidity',
        partId: 'garnish',
      },
      {
        id: 'pho-chili',
        name: 'Red bird’s-eye chilies',
        amount: 2,
        unit: 'whole',
        note: 'sliced into bright fiery rings',
        partId: 'garnish',
      },
    ],
    steps: [
      'Cover the beef bones and brisket with cold water, bring to a hard boil for 8 minutes to release impurities, then drain, scrub the bones under running water, and rinse the stockpot clean for crystal-clear broth.',
      'Char the halved onions and ginger directly over a gas flame or under a roaring broiler for 8–10 minutes until blackened in spots and sweet-smoky; rub off loose charred skin and bruise the ginger.',
      'Dry-toast the star anise, cinnamon stick, cloves, cracked black cardamom, and coriander seeds in a skillet over medium-low heat for 3 minutes until heady and fragrant, then tie tightly in cheesecloth.',
      'Return the scrubbed bones and brisket to the pot with 4 L fresh water, the charred aromatics, spice pouch, rock sugar, 1 tbsp salt, and half the fish sauce; hold at a bare, gentle simmer (never a rolling boil) for 3 hours, lifting out the brisket once fork-tender at 90 minutes.',
      'Strain the golden broth through a fine-mesh sieve, skim excess surface fat, and finish with the remaining fish sauce until richly seasoned and bright—slightly bolder than sipping strength so it balances the noodles.',
      'Blanch the soaked rice noodles in boiling water for 12–15 seconds, divide into warmed deep ceramic bowls, drape raw shaved eye-of-round and sliced brisket over top, scatter scallions and onion, and ladle boiling broth straight over the beef so it turns rosy-rare; finish with herbs, chili rings, and lime.',
    ],
    stanleysTip:
      'Parboil and scrub the bones spotless before starting the true simmer, and char whole ginger and unpeeled onions directly over an open flame—those two habits are the entire secret behind clear, smoky, restaurant-grade pho broth.',
  },
  {
    id: 'hot-pot',
    name: 'Sichuan Yin-Yang Hot Pot',
    subtitle: 'Fiery tallow mala chili broth paired with milky pork bone broth in a divided pot',
    shortLabel: 'Yin-Yang Hot Pot',
    emoji: '🍲',
    cuisine: 'Sichuan',
    prepTime: '35 min',
    cookTime: '45 min',
    baseServings: 4,
    spiceLevel: 5,
    isHot: true,
    accentColor: '#B91C1C',
    description:
      'A communal feast split down an S-curve pot: one half roiling with beef-tallow Sichuan mala chili oil and numbing peppercorns, the other a soothing milky pork bone broth for swishing marbled beef, crisp lotus root, and jade bok choy.',
    vibeTag: 'Hosting Centerpiece',
    fieldNote:
      'Splitting the pot solves the hardest hosting constraint: everyone eats from the same centerpiece regardless of spice tolerance. Blooming Pixian doubanjiang slowly in beef tallow keeps the mala side fragrant all evening instead of turning bitter.',
    pantrySpecs: [
      {
        item: 'Mala Base',
        brand: 'Haidilao Butter Spicy Mala or Pixian + Beef Tallow',
        why: 'Rich tallow carries chili aromatics cleanly onto quick-swished marbled beef.',
      },
      {
        item: 'Peppercorns',
        brand: 'Hanyuan Red & Green Sichuan Peppercorns',
        why: 'High-oil husks deliver crisp citrus aroma and a clean, electric numbing tingle.',
      },
      {
        item: 'Dipping Sauce',
        brand: 'Lee Kum Kee Sesame Paste & Kadoya Sesame Oil',
        why: 'Toasted nuttiness cools the palate and balances lingering mala heat.',
      },
    ],
    localSpots: [
      {
        name: 'Haidilao Hot Pot',
        area: 'Cupertino',
        note: 'Iconic divided yin-yang pots with blazing butter-tallow mala broth, silky bone broth, and a full dipping bar.',
      },
      {
        name: 'Mumu Hot Pot',
        area: 'Sunnyvale',
        note: 'Top-tier marbled beef cuts, crisp lotus root, and fragrant house-made broths in a sleek dining room.',
      },
    ],
    atmosphere: {
      surface: 'dark-slate',
      backdropInner: '#F9F4EC',
      backdropOuter: '#EAE0D2',
      keyLightColor: '#FFEEDB',
      keyLightIntensity: 1.65,
      ambientTint: '#F4EAE0',
    },
    parts: [
      {
        id: 'pot',
        label: 'Divided Yin-Yang Pot',
        description:
          'Brushed stainless-steel cauldron partitioned by an S-curve wall to simmer bold and delicate broths side by side.',
        cameraFocus: {
          target: [0, 0, 0],
          position: [0, 2.05, 3.05],
        },
      },
      {
        id: 'mala-broth',
        label: 'Sichuan Mala Chili Broth',
        description:
          'Blazing crimson beef-tallow base bloomed with Pixian doubanjiang, ciba chili paste, and whole aromatics.',
        cameraFocus: {
          target: [-0.45, 0.2, 0.05],
          position: [-1.85, 1.95, 2.0],
        },
      },
      {
        id: 'bone-broth',
        label: 'Creamy Pork Bone Broth',
        description:
          'Velvety ivory stock simmered briskly with ginger, red jujubes, and goji berries for rich, soothing balance.',
        cameraFocus: {
          target: [0.45, 0.2, -0.05],
          position: [1.85, 1.95, 1.95],
        },
      },
      {
        id: 'spices',
        label: 'Dried Chilies & Peppercorns',
        description:
          'Curled Erjingtiao chilies and fragrant red and green Sichuan peppercorns bobbing across the spicy surface.',
        cameraFocus: {
          target: [-0.42, 0.28, -0.1],
          position: [-1.75, 1.75, 1.85],
        },
      },
      {
        id: 'toppings',
        label: 'Lotus Root, Bok Choy & Beef Rolls',
        description:
          'Paper-thin marbled ribeye rolls, perforated crisp lotus root slices, enoki bundles, and sweet baby bok choy.',
        cameraFocus: {
          target: [0.45, 0.32, 0.12],
          position: [1.75, 1.75, 2.0],
        },
      },
    ],
    ingredients: [
      {
        id: 'hotpot-tallow',
        name: 'Beef tallow & neutral oil',
        amount: 120,
        unit: 'g',
        note: '80g rendered beef tallow + 40g rapeseed oil for signature Chongqing richness',
        partId: 'mala-broth',
      },
      {
        id: 'hotpot-doubanjiang',
        name: 'Pixian doubanjiang',
        amount: 75,
        unit: 'g',
        note: 'fermented broad bean chili paste, finely minced',
        partId: 'mala-broth',
      },
      {
        id: 'hotpot-chilies',
        name: 'Dried Sichuan chilies',
        amount: 60,
        unit: 'g',
        note: 'Erjingtiao & Facing Heaven; half soaked & minced, half whole',
        partId: 'spices',
      },
      {
        id: 'hotpot-peppercorns',
        name: 'Red & green Sichuan peppercorns',
        amount: 25,
        unit: 'g',
        note: 'soaked briefly in 1 tbsp Shaoxing wine so they do not scorch',
        partId: 'spices',
      },
      {
        id: 'hotpot-aromatics',
        name: 'Hot pot aromatics & whole spices',
        amount: 1,
        unit: 'mix',
        note: '60g smashed ginger, 8 garlic cloves, 2 star anise, 1 cassia stick, 1 bay leaf, 15g rock sugar',
        partId: 'spices',
      },
      {
        id: 'hotpot-mala-stock',
        name: 'Rich beef or chicken stock',
        amount: 1200,
        unit: 'ml',
        note: 'for building the spicy mala half',
        partId: 'mala-broth',
      },
      {
        id: 'hotpot-bone-broth',
        name: 'Milky pork bone broth',
        amount: 1200,
        unit: 'ml',
        note: 'simmered with 6 red dates, 1 tbsp goji berries & 4 ginger slices',
        partId: 'bone-broth',
      },
      {
        id: 'hotpot-beef-rolls',
        name: 'Thin-shaved marbled ribeye rolls',
        amount: 450,
        unit: 'g',
        note: '1.5 mm thick rolls that cook in a 10-second swish',
        partId: 'toppings',
      },
      {
        id: 'hotpot-lotus',
        name: 'Fresh lotus root',
        amount: 250,
        unit: 'g',
        note: 'peeled and sliced into 3 mm crisp perforated discs',
        partId: 'toppings',
      },
      {
        id: 'hotpot-bok-choy',
        name: 'Baby Shanghai bok choy',
        amount: 300,
        unit: 'g',
        note: 'halved lengthwise and rinsed thoroughly',
        partId: 'toppings',
      },
      {
        id: 'hotpot-enoki',
        name: 'Enoki & king oyster mushrooms',
        amount: 250,
        unit: 'g',
        note: 'trimmed and torn into bite-sized clusters',
        partId: 'toppings',
      },
      {
        id: 'hotpot-dip',
        name: 'Roasted sesame oil & minced garlic',
        amount: 60,
        unit: 'ml',
        note: 'divided into personal dipping bowls with chopped cilantro & oyster sauce',
        partId: 'toppings',
      },
    ],
    steps: [
      'Soak half the dried chilies in hot water for 10 minutes, drain, and mince into a glossy crimson paste; soak the Sichuan peppercorns in 1 tbsp Shaoxing wine to hydrate their husks.',
      'Melt the beef tallow and oil in a heavy wok over medium-low heat, gently infuse the smashed ginger, garlic, and whole spices for 4 minutes, then stir-fry the minced Pixian doubanjiang and chili paste for 8–10 minutes until the oil turns blazing ruby-red and deeply fragrant.',
      'Fold in the hydrated peppercorns, remaining whole dried chilies, and rock sugar; fry for 2 minutes, then pour in 1.2 L stock and simmer for 10 minutes so the spice oils bloom fully.',
      'Ladle the crimson mala broth into one side of the divided yin-yang pot; fill the other side with creamy white pork bone broth garnished with ginger slices, red dates, and goji berries.',
      'Set the pot over a tabletop burner at a lively bubble and arrange platters of marbled beef rolls, lotus root, mushrooms, and baby bok choy alongside individual sesame-oil garlic dipping bowls.',
      'Cook by texture: drop crisp lotus root and mushrooms in for 2–3 minutes, swish marbled ribeye rolls in the bubbling mala oil for 10–12 seconds until barely rosy, and finish by poaching baby bok choy in the creamy bone broth.',
    ],
    stanleysTip:
      'Always dip piping-hot mala beef into a bowl of pure roasted sesame oil, minced garlic, and fresh cilantro—the cool oil coats your palate, tames the scorching chili edge, and unlocks the citrusy hum of the Sichuan peppercorns.',
  },
  {
    id: 'mapo-tofu',
    name: 'Sichuan Mapo Tofu',
    subtitle: 'Trembling silken tofu suspended in glossy Pixian doubanjiang chili oil & crispy minced pork',
    shortLabel: 'Mapo Tofu',
    emoji: '🌶️',
    cuisine: 'Sichuan',
    prepTime: '15 min',
    cookTime: '20 min',
    baseServings: 3,
    spiceLevel: 4,
    isHot: true,
    accentColor: '#A82414',
    description:
      'Chengdu’s quintessential comfort dish: custard-soft silken tofu cubes bathed in mirror-glossy red bean chili oil, studded with caramelized pork pebbles, fermented black beans, and freshly ground numbing peppercorns.',
    vibeTag: '20-Min Weeknight Hero',
    fieldNote:
      'Mapo tofu rewards order of operations over rare equipment: blanching the tofu in salted water prevents shattering, rendering the pork fully crispy builds savory crunch, and adding starch in three waves locks in that mirror-red glaze.',
    pantrySpecs: [
      {
        item: 'Bean Paste',
        brand: 'Juan Cheng 3-Year Pixian Doubanjiang',
        why: 'Long-fermented broad beans and Erjingtiao chilies release deep mahogany oil.',
      },
      {
        item: 'Black Beans',
        brand: 'Yangjiang Fermented Black Beans (Douchi)',
        why: 'Punchy, savory bass notes that pair seamlessly with crispy rendered pork.',
      },
      {
        item: 'Peppercorns',
        brand: 'Hanyuan Tribute Sichuan Peppercorns',
        why: 'Freshly toasted and ground at the finish for bright floral fragrance.',
      },
    ],
    localSpots: [
      {
        name: 'Chef Zhao Kitchen',
        area: 'Mountain View',
        note: 'Blistering-hot, glossy Chengdu-style mapo tofu loaded with fragrant Sichuan peppercorns and savory pork.',
      },
      {
        name: 'Z & Y Restaurant',
        area: 'San Francisco',
        note: 'Chinatown legend delivering fearless, deeply aromatic mala heat and razor-sharp wok hei.',
      },
    ],
    atmosphere: {
      surface: 'dark-slate',
      backdropInner: '#FAF4ED',
      backdropOuter: '#ECE1D3',
      keyLightColor: '#FFF0DD',
      keyLightIntensity: 1.6,
      ambientTint: '#F5EBE1',
    },
    parts: [
      {
        id: 'bowl',
        label: 'Dark Clay Bowl',
        description:
          'Heavy obsidian stoneware bowl that retains intense wok heat so the tofu arrives bubbling at the table.',
        cameraFocus: {
          target: [0, 0, 0],
          position: [-0.35, 1.75, 2.95],
        },
      },
      {
        id: 'sauce',
        label: 'Doubanjiang Chili Oil',
        description:
          'Thick, shimmering mahogany sauce emulsified in three stages with starch slurry and framed by ruby chili oil.',
        cameraFocus: {
          target: [-0.25, 0.18, 0.1],
          position: [-1.55, 1.85, 2.0],
        },
      },
      {
        id: 'tofu',
        label: 'Silken Tofu Cubes',
        description:
          'Salt-poached 2 cm squares of delicate tofu that stay sharp-edged on the outside and custard-soft inside.',
        cameraFocus: {
          target: [0.15, 0.24, 0.12],
          position: [1.35, 1.65, 2.15],
        },
      },
      {
        id: 'pork',
        label: 'Crispy Minced Pork',
        description:
          'Rich ground pork fried until deeply browned and nutty, paired with savory chopped fermented black beans.',
        cameraFocus: {
          target: [-0.2, 0.28, -0.1],
          position: [-1.4, 1.7, 1.9],
        },
      },
      {
        id: 'scallions',
        label: 'Chopped Green Scallions',
        description:
          'Bright emerald scallion rings and a snowfall of freshly ground red and green Sichuan peppercorns.',
        cameraFocus: {
          target: [0.1, 0.34, 0],
          position: [1.2, 1.75, 2.05],
        },
      },
    ],
    ingredients: [
      {
        id: 'mapo-tofu',
        name: 'Soft or silken tofu',
        amount: 450,
        unit: 'g',
        note: 'cut into neat 2 cm cubes for gentle salt-water poaching',
        partId: 'tofu',
      },
      {
        id: 'mapo-pork',
        name: 'Ground pork',
        amount: 150,
        unit: 'g',
        note: '70/30 lean-to-fat ratio so it fries crisp and savory',
        partId: 'pork',
      },
      {
        id: 'mapo-doubanjiang',
        name: 'Pixian doubanjiang',
        amount: 2.5,
        unit: 'tbsp',
        note: 'finely minced into a paste for vivid red oil extraction',
        partId: 'sauce',
      },
      {
        id: 'mapo-douchi',
        name: 'Fermented black beans (douchi)',
        amount: 1,
        unit: 'tbsp',
        note: 'briefly rinsed and coarsely chopped',
        partId: 'pork',
      },
      {
        id: 'mapo-chili-flakes',
        name: 'Sichuan Erjingtiao chili flakes',
        amount: 1.5,
        unit: 'tbsp',
        note: 'fruity medium-heat flakes for crimson luster',
        partId: 'sauce',
      },
      {
        id: 'mapo-peppercorn',
        name: 'Red & green Sichuan peppercorns',
        amount: 1.5,
        unit: 'tsp',
        note: 'dry-toasted and finely ground right before finishing',
        partId: 'scallions',
      },
      {
        id: 'mapo-aromatics',
        name: 'Garlic cloves & fresh ginger',
        amount: 4,
        unit: 'cloves',
        note: 'finely minced together with 15g peeled ginger',
        partId: 'sauce',
      },
      {
        id: 'mapo-stock',
        name: 'Unsalted chicken stock',
        amount: 250,
        unit: 'ml',
        note: 'plus 1 tbsp Shaoxing wine and 1 tsp light soy sauce',
        partId: 'sauce',
      },
      {
        id: 'mapo-starch',
        name: 'Potato starch slurry',
        amount: 1.5,
        unit: 'tbsp',
        note: 'whisked with 3 tbsp cold water, added in three stages',
        partId: 'sauce',
      },
      {
        id: 'mapo-scallions',
        name: 'Green scallions or garlic greens',
        amount: 4,
        unit: 'stalks',
        note: 'whites minced for wok, emerald tops sliced for garnish',
        partId: 'scallions',
      },
      {
        id: 'mapo-oil',
        name: 'Neutral oil & roasted chili oil',
        amount: 3,
        unit: 'tbsp',
        note: '2 tbsp neutral oil for frying + 1 tbsp chili oil to finish',
        partId: 'sauce',
      },
    ],
    steps: [
      'Slide the cubed silken tofu gently into a saucepan of simmering water seasoned with 1 tsp salt and poach for 2 minutes; drain carefully in a colander to firm the edges and remove any raw soy note.',
      'Heat 2 tbsp neutral oil in a wok over medium-high heat and fry the ground pork for 4–5 minutes, breaking it into tiny pebbles until its moisture evaporates and it turns crisp and deeply browned.',
      'Drop heat to medium-low, push the pork aside, and fry the minced Pixian doubanjiang, fermented black beans, chili flakes, garlic, ginger, and scallion whites for 2 minutes until the oil blooms vivid mahogany-red.',
      'Splash Shaoxing wine around the hot wok rim, pour in the chicken stock and light soy sauce, and gently slide in the drained tofu; simmer for 4 minutes, nudging only with the back of your ladle so every cube stays whole.',
      'Swirl in the potato starch slurry in three small additions, pausing for 30 seconds between each while shaking the wok, until the sauce turns mirror-glossy, hugs every cube, and beads with crisp red oil along the edges.',
      'Pour into a warmed dark clay bowl, drizzle with 1 tbsp roasted chili oil, shower with emerald scallions, and dust generously with freshly ground red and green Sichuan peppercorns.',
    ],
    stanleysTip:
      'Blanch silken tofu cubes in lightly salted simmering water for 2 minutes before they meet the wok, and toast both red and green Sichuan peppercorns right before grinding—the cubes stay pillowy yet unbroken while the dual peppercorns bring bright, floral tingle.',
  },
  {
    id: 'xiaolongbao',
    name: 'Xiaolongbao Soup Dumplings',
    subtitle: 'Paper-thin 18-pleat wrappers cradling rich pork broth aspic & black vinegar-ginger dip',
    shortLabel: 'Xiaolongbao',
    emoji: '🥟',
    cuisine: 'Shanghainese',
    prepTime: '1 hr 15 min (+ 4 hr chill)',
    cookTime: '8 min',
    baseServings: 3,
    spiceLevel: 1,
    isHot: true,
    accentColor: '#8C6239',
    description:
      'Delicate hand-pleated Shanghainese soup dumplings steamed in woven bamboo until pearlescent and heavy with molten pork broth, served alongside Chinkiang black vinegar steeped with hair-thin ginger threads.',
    vibeTag: 'Weekend Project',
    fieldNote:
      'The magic soup inside xiaolongbao is pure thermodynamics—collagen-rich stock chills solid enough to dice and fold into cold pork, then liquefies inside the pleated dough during an 8-minute high-heat steam.',
    pantrySpecs: [
      {
        item: 'Black Vinegar',
        brand: 'Zhenjiang Chinkiang Aged Black Vinegar',
        why: 'Malty, slightly sweet acidity that cuts cleanly through rich pork broth.',
      },
      {
        item: 'Cooking Wine',
        brand: 'Pagoda Brand Shaoxing Hua Diao',
        why: 'Adds subtle nutty warmth and lifts ginger-scallion aromatics in the pork filling.',
      },
      {
        item: 'Sesame Oil',
        brand: 'Koon Chun Pure Roasted Sesame Oil',
        why: 'Deeply fragrant finishing oil folded in right before the chilled aspic cubes.',
      },
    ],
    localSpots: [
      {
        name: 'Din Tai Fung',
        area: 'Santa Clara · Valley Fair',
        note: 'Gold-standard 18-pleat wrappers with impossibly thin skins and crystal-clean pork broth.',
      },
      {
        name: 'Dough Zone',
        area: 'Cupertino',
        note: 'Juicy, piping-hot soup dumplings and crisp pan-fried buns without the marathon wait.',
      },
    ],
    atmosphere: {
      surface: 'woven-bamboo',
      backdropInner: '#FAF7F0',
      backdropOuter: '#EEE6D7',
      keyLightColor: '#FFF8EA',
      keyLightIntensity: 1.48,
      ambientTint: '#F6F0E6',
    },
    parts: [
      {
        id: 'steamer',
        label: 'Bamboo Steamer Basket',
        description:
          'Woven natural bamboo basket lined with cabbage leaves to absorb excess condensation and impart gentle wood aroma.',
        cameraFocus: {
          target: [-0.26, 0, -0.06],
          position: [-1.65, 1.85, 2.65],
        },
      },
      {
        id: 'dumplings',
        label: '18-Pleat Soup Dumplings',
        description:
          'Translucent hand-rolled wrappers gathered into neat topknots around juicy ginger-scented pork and melted broth.',
        cameraFocus: {
          target: [-0.26, 0.22, -0.06],
          position: [-0.45, 1.85, 2.2],
        },
      },
      {
        id: 'dipping-dish',
        label: 'Black Vinegar & Ginger Dip',
        description:
          'Malty aged Chinkiang black vinegar brimming with freshly julienned young ginger threads to cut through rich pork broth.',
        cameraFocus: {
          target: [1.22, -0.3, 0.44],
          position: [2.45, 1.15, 2.25],
        },
      },
    ],
    ingredients: [
      {
        id: 'xlb-aspic',
        name: 'Chilled pork skin & bone broth aspic',
        amount: 240,
        unit: 'g',
        note: 'firm collagen-rich stock jelly diced into 4 mm cubes',
        partId: 'dumplings',
      },
      {
        id: 'xlb-pork',
        name: 'Finely ground pork shoulder',
        amount: 300,
        unit: 'g',
        note: '70/30 lean-to-fat ratio for tender, bouncy filling',
        partId: 'dumplings',
      },
      {
        id: 'xlb-ginger-water',
        name: 'Scallion-ginger infusion water',
        amount: 45,
        unit: 'ml',
        note: 'warm water steeped with smashed ginger & scallion, strained',
        partId: 'dumplings',
      },
      {
        id: 'xlb-seasoning',
        name: 'Shaoxing wine & light soy sauce',
        amount: 2,
        unit: 'tbsp',
        note: '1 tbsp each plus 1 tsp sugar & 1/4 tsp ground white pepper',
        partId: 'dumplings',
      },
      {
        id: 'xlb-salt',
        name: 'Fine sea salt',
        amount: 1,
        unit: 'tsp',
        note: 'beaten into the pork to develop springy myosin texture',
        partId: 'dumplings',
      },
      {
        id: 'xlb-sesame-oil',
        name: 'Toasted sesame oil',
        amount: 1,
        unit: 'tbsp',
        note: 'folded in last to seal in savory aromatics',
        partId: 'dumplings',
      },
      {
        id: 'xlb-flour',
        name: 'All-purpose wheat flour',
        amount: 200,
        unit: 'g',
        note: 'moderate protein for silky, tear-resistant skins',
        partId: 'dumplings',
      },
      {
        id: 'xlb-dough-water',
        name: 'Warm water (60°C)',
        amount: 105,
        unit: 'ml',
        note: 'plus a pinch of salt for supple thin-rolled dough',
        partId: 'dumplings',
      },
      {
        id: 'xlb-cabbage',
        name: 'Napa cabbage leaves',
        amount: 4,
        unit: 'leaves',
        note: 'or perforated parchment liners so bottoms never stick',
        partId: 'steamer',
      },
      {
        id: 'xlb-vinegar',
        name: 'Chinkiang aged black vinegar',
        amount: 60,
        unit: 'ml',
        note: 'deeply malty Shanghainese dipping vinegar',
        partId: 'dipping-dish',
      },
      {
        id: 'xlb-ginger-threads',
        name: 'Young fresh ginger',
        amount: 30,
        unit: 'g',
        note: 'julienned into hair-thin 4 cm threads to steep in vinegar',
        partId: 'dipping-dish',
      },
    ],
    steps: [
      'Make the soup aspic ahead by simmering blanched pork skin and bones with ginger and scallions for 3 hours, straining, seasoning lightly, and chilling for 4 hours until firm; dice the cold jelly into 4 mm cubes and keep refrigerated.',
      'Stir the ground pork vigorously in one direction with salt, Shaoxing wine, light soy sauce, sugar, and white pepper, beating in the scallion-ginger water a splash at a time until glossy and tacky; fold in sesame oil, then gently distribute the ice-cold aspic cubes.',
      'Combine the flour with 60°C warm water and a pinch of salt, knead for 6 minutes until satin-smooth, and rest covered for 30 minutes; divide into 18 pieces (about 16g each) and roll into 8.5 cm rounds with translucent edges and a slightly thicker center.',
      'Spoon 20g of chilled filling into each wrapper, pinch and pleat 16–18 tight overlapping folds clockwise around the rim, draw them into a petite topknot, and twist shut cleanly with no trapped air.',
      'Line a bamboo steamer basket with napa cabbage leaves or perforated parchment, space the dumplings 2 cm apart so they can puff without touching, and set over a wok of briskly boiling water.',
      'Steam covered over high heat for 7–8 minutes until the skins turn pearlescent and sag gently with hot molten soup inside; serve immediately in the steaming basket alongside Chinkiang black vinegar packed with ginger threads.',
    ],
    stanleysTip:
      'Keep your diced pork aspic ice-cold until the exact moment the steamer hits the boil, and roll every wrapper feather-thin at the perimeter while leaving the center slightly thicker—the base holds the molten broth cleanly while the pleats melt on your tongue.',
  },
];

export const RECIPE_MAP: Record<DishId, DishRecipe> = {
  curry: RECIPES[0],
  pizza: RECIPES[1],
  sushi: RECIPES[2],
  pho: RECIPES[3],
  'hot-pot': RECIPES[4],
  'mapo-tofu': RECIPES[5],
  xiaolongbao: RECIPES[6],
};

export function getDishById(id: string | null | undefined): DishRecipe {
  if (id && Object.prototype.hasOwnProperty.call(RECIPE_MAP, id)) {
    return RECIPE_MAP[id as DishId];
  }
  return RECIPES[0];
}
