// Fixed menu. This is the only source of truth for prices.
export const MENU = Object.freeze([
  Object.freeze({ id: 'pav-bhaji', name: 'Pav Bhaji', price: 105, unit: 'serving', description: 'Bhaji + 2 pav' }),
  Object.freeze({ id: 'extra-pav', name: 'Extra Pav', price: 10, unit: 'piece', description: 'Butter pav' }),
  Object.freeze({ id: 'mojito', name: 'Mojito', price: 50, unit: 'glass', description: 'Fresh mint mojito' }),
]);

export const MENU_BY_ID = new Map(MENU.map((item) => [item.id, item]));
