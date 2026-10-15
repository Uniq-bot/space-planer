import { FloorPlan, Wall, Opening, SymbolItem, Room } from '../types/floorplan';

const createWall = (id: string, x1: number, y1: number, x2: number, y2: number, thickness = 15, height = 270): Wall => ({
  id,
  x1,
  y1,
  x2,
  y2,
  thickness,
  height,
  wallType: 'interior'
});

export const TEMPLATES: Record<string, () => FloorPlan> = {
  'studio-apartment': () => {
    // Reverse engineered directly from SpacePlanner: 500cm x 640cm outer rectangle with bath enclosure
    const walls: Wall[] = [
      createWall('w_top', 0, 0, 500, 0, 20),
      createWall('w_right', 500, 0, 500, 640, 20),
      createWall('w_bottom', 500, 640, 0, 640, 20),
      createWall('w_left', 0, 640, 0, 0, 20),
      // Bath partition walls
      createWall('w_bath_h', 0, 420, 240, 420, 10),
      createWall('w_bath_v', 240, 420, 240, 640, 10),
    ];

    const openings: Opening[] = [
      {
        id: 'op_entry_door',
        wall_id: 'w_left',
        type: 'door',
        position: 0.70,
        width: 90,
        height: 210,
        swing: 'left'
      },
      {
        id: 'op_bath_door',
        wall_id: 'w_bath_h',
        type: 'door',
        position: 0.65,
        width: 80,
        height: 210,
        swing: 'right'
      },
      {
        id: 'op_main_window',
        wall_id: 'w_top',
        type: 'window',
        position: 0.50,
        width: 160,
        height: 130,
        sill_height: 90,
        swing: 'none',
        mullion_cols: 2
      },
      {
        id: 'op_side_window',
        wall_id: 'w_right',
        type: 'window',
        position: 0.35,
        width: 120,
        height: 130,
        sill_height: 90,
        swing: 'none'
      }
    ];

    const symbols: SymbolItem[] = [
      { id: 'sym_bed', type: 'bed_queen', category: 'bedroom', x: 130, y: 150, width: 160, depth: 200, rotation: 0 },
      { id: 'sym_night1', type: 'nightstand', category: 'bedroom', x: 30, y: 80, width: 45, depth: 40, rotation: 0 },
      { id: 'sym_sofa', type: 'sofa_2', category: 'living', x: 360, y: 180, width: 160, depth: 85, rotation: 0 },
      { id: 'sym_coffee', type: 'table_coffee', category: 'living', x: 360, y: 260, width: 90, depth: 55, rotation: 0 },
      { id: 'sym_tv', type: 'tv_unit', category: 'living', x: 470, y: 180, width: 140, depth: 40, rotation: 90 },
      { id: 'sym_dining', type: 'table_dining_4', category: 'dining', x: 360, y: 380, width: 120, depth: 80, rotation: 0 },
      { id: 'sym_counter', type: 'counter', category: 'kitchen', x: 360, y: 560, width: 160, depth: 60, rotation: 0 },
      { id: 'sym_ksink', type: 'counter_sink', category: 'kitchen', x: 450, y: 560, width: 90, depth: 60, rotation: 0 },
      { id: 'sym_fridge', type: 'fridge', category: 'kitchen', x: 260, y: 560, width: 65, depth: 65, rotation: 0 },
      // Bathroom
      { id: 'sym_toilet', type: 'toilet', category: 'bathroom', x: 60, y: 580, width: 45, depth: 70, rotation: 0 },
      { id: 'sym_bsink', type: 'sink', category: 'bathroom', x: 180, y: 460, width: 60, depth: 45, rotation: 180 },
      { id: 'sym_shower', type: 'shower', category: 'bathroom', x: 60, y: 460, width: 85, depth: 85, rotation: 0 }
    ];

    const rooms: Room[] = [
      { id: 'room_main', name: 'Living & Sleeping Area', x: 260, y: 280, area: 24.5, floorMaterial: 'oak_wood' },
      { id: 'room_bath', name: 'Bathroom', x: 120, y: 530, area: 5.2, floorMaterial: 'marble_tile' }
    ];

    return {
      walls,
      openings,
      symbols,
      rooms,
      metadata: {
        name: 'Studio Apartment',
        units: 'cm',
        grid_size: 50,
        scale: 1
      }
    };
  },

  'one-bedroom-apartment': () => {
    // 760cm x 600cm
    const walls: Wall[] = [
      createWall('w1', 0, 0, 760, 0, 20),
      createWall('w2', 760, 0, 760, 600, 20),
      createWall('w3', 760, 600, 0, 600, 20),
      createWall('w4', 0, 600, 0, 0, 20),
      // Partition walls
      createWall('w5', 380, 0, 380, 360, 15),
      createWall('w6', 380, 360, 760, 360, 15),
      createWall('w7', 0, 360, 200, 360, 15),
      createWall('w8', 200, 360, 200, 600, 15),
    ];

    const openings: Opening[] = [
      { id: 'op1', wall_id: 'w4', type: 'door', position: 0.65, width: 90, height: 210, swing: 'left' },
      { id: 'op2', wall_id: 'w5', type: 'door', position: 0.70, width: 85, height: 210, swing: 'right' },
      { id: 'op3', wall_id: 'w7', type: 'door', position: 0.60, width: 80, height: 210, swing: 'left' },
      { id: 'op4', wall_id: 'w1', type: 'window', position: 0.25, width: 160, height: 130, sill_height: 90, swing: 'none', mullion_cols: 2 },
      { id: 'op5', wall_id: 'w1', type: 'window', position: 0.75, width: 180, height: 130, sill_height: 90, swing: 'none', mullion_cols: 2 },
      { id: 'op6', wall_id: 'w2', type: 'window', position: 0.75, width: 140, height: 130, sill_height: 90, swing: 'none' },
    ];

    const symbols: SymbolItem[] = [
      // Bedroom
      { id: 'b_bed', type: 'bed_king', category: 'bedroom', x: 190, y: 150, width: 180, depth: 210, rotation: 0 },
      { id: 'b_night1', type: 'nightstand', category: 'bedroom', x: 70, y: 70, width: 45, depth: 40, rotation: 0 },
      { id: 'b_night2', type: 'nightstand', category: 'bedroom', x: 310, y: 70, width: 45, depth: 40, rotation: 0 },
      { id: 'b_wardrobe', type: 'wardrobe', category: 'bedroom', x: 60, y: 260, width: 150, depth: 60, rotation: 90 },
      // Living Room
      { id: 'l_sofa', type: 'sofa_3', category: 'living', x: 570, y: 160, width: 220, depth: 90, rotation: 0 },
      { id: 'l_coffee', type: 'table_coffee', category: 'living', x: 570, y: 240, width: 110, depth: 60, rotation: 0 },
      { id: 'l_tv', type: 'tv_unit', category: 'living', x: 720, y: 160, width: 160, depth: 40, rotation: 90 },
      { id: 'l_plant', type: 'plant_indoor', category: 'living', x: 420, y: 70, width: 50, depth: 50, rotation: 0 },
      // Dining & Kitchen
      { id: 'd_table', type: 'table_dining_4', category: 'dining', x: 580, y: 480, width: 120, depth: 80, rotation: 0 },
      { id: 'k_counter', type: 'counter', category: 'kitchen', x: 280, y: 550, width: 120, depth: 60, rotation: 0 },
      { id: 'k_sink', type: 'counter_sink', category: 'kitchen', x: 390, y: 550, width: 90, depth: 60, rotation: 0 },
      { id: 'k_stove', type: 'stove', category: 'kitchen', x: 470, y: 550, width: 60, depth: 60, rotation: 0 },
      // Bathroom
      { id: 'ba_tub', type: 'bathtub', category: 'bathroom', x: 100, y: 540, width: 150, depth: 75, rotation: 0 },
      { id: 'ba_toilet', type: 'toilet', category: 'bathroom', x: 160, y: 420, width: 45, depth: 70, rotation: 180 },
      { id: 'ba_sink', type: 'sink', category: 'bathroom', x: 50, y: 420, width: 60, depth: 45, rotation: 180 },
    ];

    const rooms: Room[] = [
      { id: 'r1', name: 'Master Bedroom', x: 190, y: 180, area: 13.5, floorMaterial: 'herringbone_parquet' },
      { id: 'r2', name: 'Living Room', x: 570, y: 180, area: 21.0, floorMaterial: 'oak_wood' },
      { id: 'r3', name: 'Kitchen & Dining', x: 420, y: 470, area: 15.2, floorMaterial: 'polished_concrete' },
      { id: 'r4', name: 'Bathroom', x: 100, y: 470, area: 5.8, floorMaterial: 'marble_tile' }
    ];

    return {
      walls,
      openings,
      symbols,
      rooms,
      metadata: {
        name: 'One Bedroom Apartment',
        units: 'cm',
        grid_size: 50,
        scale: 1
      }
    };
  },

  'two-bedroom-suite': () => {
    // 900cm x 700cm
    const walls: Wall[] = [
      createWall('w1', 0, 0, 900, 0, 20),
      createWall('w2', 900, 0, 900, 700, 20),
      createWall('w3', 900, 700, 0, 700, 20),
      createWall('w4', 0, 700, 0, 0, 20),
      // Dividing walls
      createWall('w5', 350, 0, 350, 350, 15),
      createWall('w6', 0, 350, 350, 350, 15),
      createWall('w7', 600, 0, 600, 350, 15),
      createWall('w8', 600, 350, 900, 350, 15),
      createWall('w9', 650, 350, 650, 700, 15),
    ];

    const openings: Opening[] = [
      { id: 'op1', wall_id: 'w4', type: 'door', position: 0.65, width: 95, height: 210, swing: 'left' },
      { id: 'op2', wall_id: 'w6', type: 'door', position: 0.70, width: 85, height: 210, swing: 'right' },
      { id: 'op3', wall_id: 'w8', type: 'door', position: 0.25, width: 85, height: 210, swing: 'left' },
      { id: 'op4', wall_id: 'w9', type: 'door', position: 0.35, width: 80, height: 210, swing: 'right' },
      { id: 'op5', wall_id: 'w1', type: 'window', position: 0.20, width: 160, height: 130, sill_height: 90, swing: 'none', mullion_cols: 2 },
      { id: 'op6', wall_id: 'w1', type: 'window', position: 0.80, width: 160, height: 130, sill_height: 90, swing: 'none', mullion_cols: 2 },
      { id: 'op7', wall_id: 'w3', type: 'window', position: 0.35, width: 200, height: 130, sill_height: 90, swing: 'none', mullion_cols: 3 },
    ];

    const symbols: SymbolItem[] = [
      // Bed 1
      { id: 'b1_bed', type: 'bed_queen', category: 'bedroom', x: 180, y: 150, width: 160, depth: 200, rotation: 0 },
      { id: 'b1_ward', type: 'wardrobe', category: 'bedroom', x: 60, y: 250, width: 150, depth: 60, rotation: 90 },
      // Bed 2
      { id: 'b2_bed', type: 'bed_single', category: 'bedroom', x: 750, y: 150, width: 90, depth: 200, rotation: 0 },
      { id: 'b2_desk', type: 'desk', category: 'office', x: 840, y: 260, width: 120, depth: 60, rotation: 90 },
      // Living & Dining
      { id: 'l_sofa', type: 'sofa_3', category: 'living', x: 320, y: 550, width: 220, depth: 90, rotation: 0 },
      { id: 'l_coffee', type: 'table_coffee', category: 'living', x: 320, y: 460, width: 100, depth: 60, rotation: 0 },
      { id: 'l_tv', type: 'tv_unit', category: 'living', x: 80, y: 550, width: 140, depth: 40, rotation: 90 },
      { id: 'd_table', type: 'table_dining_6', category: 'dining', x: 500, y: 460, width: 150, depth: 85, rotation: 0 },
      // Kitchen
      { id: 'k_sink', type: 'counter_sink', category: 'kitchen', x: 750, y: 640, width: 120, depth: 60, rotation: 0 },
      { id: 'k_stove', type: 'stove', category: 'kitchen', x: 840, y: 640, width: 60, depth: 60, rotation: 0 },
      // Bath
      { id: 'ba_tub', type: 'bathtub', category: 'bathroom', x: 750, y: 420, width: 150, depth: 75, rotation: 0 },
      { id: 'ba_wc', type: 'toilet', category: 'bathroom', x: 860, y: 480, width: 45, depth: 70, rotation: 90 },
      { id: 'ba_sink', type: 'sink', category: 'bathroom', x: 700, y: 480, width: 60, depth: 45, rotation: 90 },
    ];

    const rooms: Room[] = [
      { id: 'r1', name: 'Master Bedroom', x: 170, y: 170, area: 12.2, floorMaterial: 'oak_wood' },
      { id: 'r2', name: 'Second Bedroom', x: 750, y: 170, area: 10.5, floorMaterial: 'herringbone_parquet' },
      { id: 'r3', name: 'Open Living & Dining', x: 330, y: 520, area: 28.0, floorMaterial: 'oak_wood' },
      { id: 'r4', name: 'Bathroom', x: 770, y: 450, area: 6.8, floorMaterial: 'marble_tile' },
      { id: 'r5', name: 'Kitchen', x: 780, y: 600, area: 8.5, floorMaterial: 'polished_concrete' }
    ];

    return {
      walls,
      openings,
      symbols,
      rooms,
      metadata: {
        name: 'Two Bedroom Suite',
        units: 'cm',
        grid_size: 50,
        scale: 1
      }
    };
  }
};
