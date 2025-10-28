export enum PodType {
  FREE = 'free',
  COMMUNITY = 'community',
  PRIVATE = 'private',
}

export const POD_FOLDERS: Record<PodType, string> = {
  [PodType.FREE]: 'public',
  [PodType.COMMUNITY]: 'community',
  [PodType.PRIVATE]: 'private',
};

