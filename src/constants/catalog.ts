import { FurnitureCatalogItem } from '../types/floorplan';

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  // Bedroom
  { id: 'bed_king', type: 'bed_king', name: 'King Floor Bed', category: 'bedroom', width: 180, depth: 210, height: 110, keywords: 'bed king master mattress sleep floor' },
  { id: 'bed_queen', type: 'bed_queen', name: 'Queen Bed', category: 'bedroom', width: 160, depth: 200, height: 110, keywords: 'bed queen double mattress sleep' },
  { id: 'bed_single', type: 'bed_single', name: 'Single Bed', category: 'bedroom', width: 90, depth: 200, height: 90, keywords: 'bed single twin child guest' },
  { id: 'nightstand', type: 'nightstand', name: 'Nightstand with Lamp', category: 'bedroom', width: 45, depth: 40, height: 70, keywords: 'nightstand bedside table lamp drawer' },

  // Living Room
  { id: 'sofa_3', type: 'sofa_3', name: '3-Seater Sofa', category: 'living', width: 220, depth: 90, height: 80, keywords: 'sofa couch 3-seater living comfort bt isola' },
  { id: 'sofa_2', type: 'sofa_2', name: '2-Seater Loveseat', category: 'living', width: 160, depth: 85, height: 80, keywords: 'sofa loveseat 2-seater living modern cream' },
  { id: 'armchair', type: 'armchair', name: 'Armchair', category: 'living', width: 85, depth: 85, height: 75, keywords: 'armchair accent chair lounge seat' },
  { id: 'table_coffee', type: 'table_coffee', name: 'Coffee Table', category: 'living', width: 110, depth: 60, height: 45, keywords: 'coffee table center living tea' },
  { id: 'tv_unit', type: 'tv_unit', name: 'Media Console & TV', category: 'living', width: 160, depth: 40, height: 50, keywords: 'tv unit television console media entertainment' },
  { id: 'bookcase', type: 'bookcase', name: 'Bookshelf', category: 'living', width: 100, depth: 35, height: 190, keywords: 'bookshelf bookcase shelving storage books' },
  { id: 'plant_indoor', type: 'plant_indoor', name: 'Indoor Potted Plant', category: 'living', width: 50, depth: 50, height: 90, keywords: 'plant indoor ficus palm greenery pot' },
  { id: 'plant_ficus', type: 'plant_ficus', name: 'Ficus Floor Plant', category: 'living', width: 50, depth: 50, height: 100, keywords: 'plant ficus floor indoor greenery decor' },

  // Dining
  { id: 'table_dining_6', type: 'table_dining_6', name: 'Dining Table (6 seats)', category: 'dining', width: 160, depth: 90, height: 75, keywords: 'dining table 6 chairs eat banquet tablecloth' },
  { id: 'table_round_6', type: 'table_round_6', name: 'Round Dining Table', category: 'dining', width: 130, depth: 130, height: 75, keywords: 'dining table round circular 6 chairs' },
  { id: 'chair', type: 'chair', name: 'Dining Chair', category: 'dining', width: 45, depth: 45, height: 85, keywords: 'chair seat dining kitchen wood' },

  // Kitchen
  { id: 'counter', type: 'counter', name: 'Base Counter Unit', category: 'kitchen', width: 120, depth: 60, height: 90, keywords: 'counter kitchen cabinet base worktop' },
  { id: 'stove', type: 'stove', name: 'Gas Stove & Cooktop', category: 'kitchen', width: 60, depth: 60, height: 90, keywords: 'stove oven cooker range induction cooktop gas' },
  { id: 'fridge', type: 'fridge', name: 'Refrigerator', category: 'kitchen', width: 70, depth: 70, height: 185, keywords: 'refrigerator fridge freezer appliance' },
  { id: 'tall_cabinet', type: 'tall_cabinet', name: 'Pantry Tall Cabinet', category: 'kitchen', width: 60, depth: 60, height: 210, keywords: 'pantry tall cabinet storage kitchen kilburn' },

  // Bathroom
  { id: 'toilet', type: 'toilet', name: 'Water Closet (Toilet)', category: 'bathroom', width: 45, depth: 70, height: 75, keywords: 'toilet wc commode restroom bath' },
  { id: 'sink', type: 'sink', name: 'Bathroom Vanity Sink', category: 'bathroom', width: 65, depth: 50, height: 85, keywords: 'sink vanity basin mirror bathroom faucet' },
  { id: 'bathtub', type: 'bathtub', name: 'Bathtub', category: 'bathroom', width: 160, depth: 75, height: 55, keywords: 'bathtub tub soaking bath shower' },
  { id: 'shower', type: 'shower', name: 'Walk-in Shower', category: 'bathroom', width: 100, depth: 100, height: 210, keywords: 'shower enclosure glass walk-in bathroom cabin' },

  // Office
  { id: 'desk', type: 'desk', name: 'Workstation Desk', category: 'office', width: 140, depth: 70, height: 75, keywords: 'desk workstation table computer study finished' },
  { id: 'office_chair', type: 'office_chair', name: 'Ergonomic Desk Chair', category: 'office', width: 60, depth: 60, height: 95, keywords: 'office chair ergonomic swivel work seat' },

  // Electrical
  { id: 'ceiling_light', type: 'ceiling_light', name: 'Ceiling Pendant Light', category: 'electrical', width: 40, depth: 40, height: 30, keywords: 'light ceiling lamp fixture chandelier' },
  { id: 'outlet', type: 'outlet', name: 'Duplex Wall Outlet', category: 'electrical', width: 25, depth: 15, height: 30, keywords: 'outlet socket power plug electrical wall' }
];
