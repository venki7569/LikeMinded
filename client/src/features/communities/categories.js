export const COMMUNITY_CATEGORIES = [
  { id: 'technology', label: 'Technology' },
  { id: 'science', label: 'Science' },
  { id: 'arts', label: 'Arts' },
  { id: 'career', label: 'Career' },
  { id: 'education', label: 'Education' },
  { id: 'health', label: 'Health' },
  { id: 'sports', label: 'Sports' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'music', label: 'Music' },
  { id: 'other', label: 'Other' },
];

export function categoryLabel(id) {
  return COMMUNITY_CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

export default COMMUNITY_CATEGORIES;
