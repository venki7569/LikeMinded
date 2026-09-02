export const RELATIONSHIP_STATUS = Object.freeze({
  NONE: 'none',
  OUTGOING_PENDING: 'outgoing_pending',
  INCOMING_PENDING: 'incoming_pending',
  CONNECTED: 'connected',
  BLOCKED: 'blocked',
});

const CARD_SELECT = 'name username occupation location avatar skills interests profileVisibility';

export function toPublicCard(user) {
  if (!user) return null;
  const json = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return {
    id: json.id ?? json._id?.toString(),
    displayName: json.name,
    username: json.username,
    occupation: json.occupation ?? '',
    location: json.location ?? { city: '', country: '' },
    profileImage: json.avatar ?? json.profileImage ?? { url: '', publicId: '' },
    skills: json.skills ?? [],
    interests: json.interests ?? [],
  };
}

export function sharedCount(left = [], right = []) {
  const other = new Set((right ?? []).map((item) => String(item).toLowerCase()));
  return (left ?? []).filter((item) => other.has(String(item).toLowerCase())).length;
}

export { CARD_SELECT };
export default toPublicCard;
