/**
 * MIGRATION SCRIPT — Run once to import 2025 Excel data into Supabase
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=your_service_key node migrate.js
 *
 * Use the SERVICE ROLE key (not anon key) so RLS is bypassed during import.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Parsed from 2025_Show_Unit_Shipping_Control_Doc.xlsx
const shows = [
  {
    show_name: 'IPPE', year: 2025, status: 'Completed', booth_number: 'C18143', sales_order: null, show_contact: 'Mason',
    dates_start: '2025-01-28', dates_end: '2025-01-30', move_in: '2025-01-26', move_out: '2025-01-31',
    notes: 'custom booth',
    equipment: [
      { item_no: null, equipment_name: 'Meat Pump', crate_number: null },
      { item_no: null, equipment_name: 'Pipeline', crate_number: null },
      { item_no: null, equipment_name: 'Combo', crate_number: null },
      { item_no: null, equipment_name: 'Sanitary Conveyor', crate_number: null },
    ],
    shipping: []
  },
  {
    show_name: 'West Pack', year: 2025, status: 'Completed', booth_number: '420', sales_order: null, show_contact: 'Mason',
    dates_start: '2025-02-04', dates_end: '2025-02-06', move_in: null, move_out: null,
    notes: "20' pop up booth (new)",
    equipment: [
      { item_no: null, equipment_name: 'Raptor 200 Standalone', crate_number: null },
      { item_no: null, equipment_name: 'Raptor Combo', crate_number: null },
      { item_no: null, equipment_name: 'BRC', crate_number: null },
    ],
    shipping: []
  },
  {
    show_name: 'IAOM Latin America', year: 2025, status: 'Completed', booth_number: 'Table 23', sales_order: null, show_contact: 'Gonzalo',
    dates_start: '2025-02-03', dates_end: '2025-02-05', move_in: null, move_out: null, notes: null,
    equipment: [], shipping: []
  },
  {
    show_name: 'Food Northwest', year: 2025, status: 'Completed', booth_number: '536', sales_order: '104967', show_contact: 'Jake',
    dates_start: '2025-03-19', dates_end: '2025-03-20',
    move_in: 'Tue, March 18, 2025 8:00 am - 6:00 pm', move_out: 'Thursday, March 20, 2025 4:00 pm - 10:00 pm',
    notes: null,
    equipment: [
      { item_no: null, equipment_name: 'Raptor Combo', crate_number: null },
      { item_no: null, equipment_name: 'Gravity', crate_number: null },
    ],
    shipping: []
  },
  {
    show_name: 'Bakery Showcase', year: 2025, status: 'Completed', booth_number: '111', sales_order: '105283', show_contact: 'Victor',
    dates_start: '2025-04-14', dates_end: '2025-04-15',
    move_in: 'waiting for boneyward to send info', move_out: 'Tue - april 15th - 5pm',
    notes: null,
    equipment: [
      { item_no: null, equipment_name: 'BRC', crate_number: null },
    ],
    shipping: []
  },
  {
    show_name: 'Cheese Expo', year: 2025, status: 'Completed', booth_number: '604', sales_order: null, show_contact: 'Mason',
    dates_start: '2025-04-15', dates_end: '2025-04-17', move_in: null, move_out: null, notes: null,
    equipment: [
      { item_no: null, equipment_name: 'BRC', notes: 'MD Head (Bob to bring)', crate_number: null },
    ],
    shipping: []
  },
  {
    show_name: 'IPBS', year: 2025, status: 'Completed', booth_number: '2105', sales_order: '105433', show_contact: 'Mason',
    dates_start: '2025-04-29', dates_end: '2025-05-01',
    move_in: 'Friday, April 25th - 11AM', move_out: 'Thursday, May 1, 2025 3:00 pm – 10:00 pm',
    notes: null,
    equipment: [
      { item_no: null, equipment_name: 'Raptor BBK Combo', notes: 'system at the office', crate_number: null },
      { item_no: null, equipment_name: 'Gravity', notes: 'system at the office', crate_number: null },
    ],
    shipping: []
  },
  {
    show_name: 'IAOM', year: 2025, status: 'Completed', booth_number: '309', sales_order: '105742', show_contact: 'Mason',
    dates_start: '2025-04-29', dates_end: '2025-05-01',
    move_in: 'Tuesday, April 29 - 10AM -4:30PM', move_out: 'Thursday May 1 - 1:30PM -5:00PM',
    notes: null,
    equipment: [
      { item_no: null, equipment_name: 'Raptor BBK Combo', crate_number: null },
      { item_no: null, equipment_name: 'Lab Unit', crate_number: null },
      { item_no: null, equipment_name: 'Gravity', crate_number: null },
    ],
    shipping: []
  },
  {
    show_name: 'Expo Pack Guadalajara', year: 2025, status: 'Confirmed', booth_number: 'J-2532', sales_order: null, show_contact: 'Gonzalo',
    dates_start: '2025-06-10', dates_end: '2025-06-12', move_in: null, move_out: null, notes: null,
    equipment: [], shipping: []
  },
  {
    show_name: 'Food Tech Pack Tech', year: 2025, status: 'Confirmed', booth_number: 'C16', sales_order: null, show_contact: 'Eric',
    dates_start: '2025-09-02', dates_end: '2025-09-04', move_in: null, move_out: null, notes: null,
    equipment: [], shipping: []
  },
  {
    show_name: 'IBIE', year: 2025, status: 'Confirmed', booth_number: '5419', sales_order: '107937', show_contact: 'Mason',
    dates_start: '2025-09-13', dates_end: '2025-09-17',
    move_in: 'Sept 10, 8:00 am', move_out: 'Sept 20, 10:00 am',
    notes: null,
    equipment: [
      { item_no: '1', equipment_name: 'Hospitality Crate', serial_numbers: '-', part_numbers: '-', crate_number: '1', notes: null },
      { item_no: '2', equipment_name: 'SXS Interceptor', serial_numbers: 'CD31291, CC07260', part_numbers: 'D-ISHR14X5S-EPBC0; C-V60X12BSA', crate_number: '2', notes: null },
      { item_no: '3', equipment_name: 'Sanitary Conveyor', serial_numbers: 'CD32231, CC07576', part_numbers: 'D-SSHR14X5S-EPB, C-C60x12BSA', crate_number: '3', notes: null },
      { item_no: '4', equipment_name: 'Raptor BBK Combo', serial_numbers: 'CD32288, CW00149', part_numbers: 'W-RAPBBK-M-W-1625X610-RL-XX', crate_number: '4', notes: null },
      { item_no: '5', equipment_name: 'Raptor Combo', serial_numbers: 'CD32054, CW00130', part_numbers: 'D-SSHR14X7S-EPH, W-RAP-M-W-CR-2405X300-RL-AB', crate_number: '5', notes: null },
    ],
    shipping: [
      { direction: 'pre-show', carrier: 'Regal', ship_date: '2025-09-08', notes: null },
      { direction: 'post-show', carrier: 'Regal', ship_date: '2025-09-20', notes: 'Crates 1, 4, 5: Hold in Vegas for PELV' },
    ]
  },
  {
    show_name: 'Pack Expo Las Vegas', year: 2025, status: 'Confirmed', booth_number: 'W-3670', sales_order: '107939', show_contact: 'Mason',
    dates_start: '2025-09-29', dates_end: '2025-10-01',
    move_in: "Thurs, Sept 25, 12:30 pm", move_out: 'Fri, Oct 3, 12:30 pm',
    notes: null,
    equipment: [
      { item_no: '1', equipment_name: 'ICON XR Combo', serial_numbers: 'Cx01006', part_numbers: 'X-ICON-G08S-X-2415X400-LR-XX', crate_number: '1', notes: null },
      { item_no: '2', equipment_name: 'Lab Unit', serial_numbers: 'W/ CD32982, CG01641', part_numbers: 'W/ D-SSVC4S-EPH, G-L3.5X3.5-54.5FG', crate_number: '2', notes: 'Held in Vegas' },
      { item_no: '3', equipment_name: 'Raptor 200 Standalone', serial_numbers: 'CW00012', part_numbers: 'W-RAP-I-W-R-1310X200-RL-AB', crate_number: '3', notes: null },
      { item_no: '4', equipment_name: 'Raptor Combo', serial_numbers: 'CD32054, CW00130', part_numbers: 'D-SSHR14X7S-EPH, W-RAP-M-W-CR-2405X300-RL-AB', crate_number: '4', notes: 'Held in Vegas' },
      { item_no: '5', equipment_name: 'Roller Ball Reject', serial_numbers: 'CC07914', part_numbers: 'C-S43X24', crate_number: '5', notes: null },
      { item_no: '6', equipment_name: 'Vertex', serial_numbers: '16440', part_numbers: 'D-SVVC8.5W-BEH; S-STAND', crate_number: '6', notes: null },
      { item_no: '7', equipment_name: 'Interceptor BRC', serial_numbers: 'CD32966, CC07329', part_numbers: 'D-SSHR20X14S-EPB, C-V72X18BSA', crate_number: '7', notes: null },
      { item_no: '8', equipment_name: 'Hospitality Crate', serial_numbers: '-', part_numbers: '-', crate_number: '8', notes: 'Held in Vegas' },
      { item_no: '9', equipment_name: 'Low Cost Raptor', serial_numbers: 'CW00196', part_numbers: 'W-FRAP-I-W-1030X300-LR-XX-L1', crate_number: '9', notes: null },
      { item_no: '10', equipment_name: 'Multi Lane', serial_numbers: '22495, CVF-4791', part_numbers: 'D-SSHR4X4S-EPBC0, C-C60X3FG', crate_number: '10', notes: null },
      { item_no: null, equipment_name: 'Raptor BBK Combo', serial_numbers: 'CW00149, CD32288', part_numbers: 'D-SSHR26X12G-EPH, W-RAPBBK-M-W-1625X610-RL-XX', crate_number: null, notes: 'Lab unit removed from crate with BBK Combo. It will have its own crate to be sent to PELV' },
    ],
    shipping: [
      { direction: 'pre-show', carrier: 'FTI', ship_date: '2025-09-12', notes: 'ICON XR Combo' },
      { direction: 'pre-show', carrier: 'Regal', ship_date: '2025-09-22', notes: null },
      { direction: 'post-show', carrier: 'FTI', ship_date: '2025-10-03', notes: 'ICON XR Combo' },
      { direction: 'post-show', carrier: 'Regal', ship_date: '2025-10-03', notes: null },
    ]
  },
  {
    show_name: 'ADM Toronto', year: 2025, status: 'Confirmed', booth_number: '1721', sales_order: '109943', show_contact: 'Jake',
    dates_start: '2025-10-21', dates_end: '2025-10-23',
    move_in: 'Mon, Oct 20, 8 a.m. – 5 p.m.', move_out: 'Thurs, Oct 23, 3 p.m. - 8 p.m.',
    notes: '10 ft pop up booth and marketing materials',
    equipment: [
      { item_no: '1', equipment_name: 'ICON XR Combo', serial_numbers: 'CX01006', part_numbers: 'X-ICON-G08S-X-2415X400-LR-XX', crate_number: '1', notes: null },
      { item_no: '2', equipment_name: 'Raptor Flex', serial_numbers: 'CW00196', part_numbers: 'W-FRAP-I-W-1030X300-LR-XX-L1', crate_number: '2', notes: null },
      { item_no: '3', equipment_name: 'Interceptor BRC', serial_numbers: '22653, CVF-5209', part_numbers: 'CVF-5209, C-V60X12AB', crate_number: '3', notes: null },
    ],
    shipping: [
      { direction: 'pre-show', carrier: 'FTI', ship_date: null, notes: null },
      { direction: 'post-show', carrier: 'FTI', ship_date: '2025-10-17', notes: null },
    ]
  },
  {
    show_name: 'The Almond Conference', year: 2025, status: 'TBA', booth_number: 'TBA', sales_order: null, show_contact: 'Mason',
    dates_start: null, dates_end: null, move_in: null, move_out: null, notes: null,
    equipment: [
      { item_no: null, equipment_name: 'Raptor BBK Combo', crate_number: null },
      { item_no: null, equipment_name: 'Gravity', crate_number: null },
    ],
    shipping: []
  },
]

async function migrate() {
  console.log(`Starting migration of ${shows.length} shows...\n`)
  let totalEquipment = 0
  let totalShipping = 0

  for (const show of shows) {
    const { equipment, shipping, ...showData } = show

    // Insert show
    const { data: showRecord, error: showError } = await supabase
      .from('tradeshows')
      .insert(showData)
      .select()
      .single()

    if (showError) {
      console.error(`ERROR inserting show "${show.show_name}":`, showError.message)
      continue
    }
    console.log(`✓ Show: ${show.show_name} (${showRecord.id})`)

    // Insert equipment
    for (const equip of equipment) {
      const { error } = await supabase.from('equipment').insert({ ...equip, tradeshow_id: showRecord.id })
      if (error) console.error(`  ERROR inserting equipment "${equip.equipment_name}":`, error.message)
      else totalEquipment++
    }

    // Insert shipping
    for (const ship of shipping) {
      const { error } = await supabase.from('shipping').insert({ ...ship, tradeshow_id: showRecord.id })
      if (error) console.error(`  ERROR inserting shipping:`, error.message)
      else totalShipping++
    }
  }

  console.log(`\nMigration complete:`)
  console.log(`  ${shows.length} shows`)
  console.log(`  ${totalEquipment} equipment records`)
  console.log(`  ${totalShipping} shipping records`)
}

migrate().catch(console.error)
