import type { DeskRole, FilterMode, OutputTarget, WishPruneMode } from "@/lib/pulse/logic";

export type TrackSource = "preview" | "spotify" | "archive" | "youtube" | "link";

export type TrackInput = {
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
  source: TrackSource;
  externalId: string;
  explicit: boolean;
  durationMs: number;
};

export type QueueItem = TrackInput & {
  id: number;
  addedByName: string;
  mine: boolean;
  status: string;
  score: number;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
  blocked: boolean;
  createdAt: string;
};

export type PlaybackView = {
  mode: "idle" | "track" | "fallback" | "announcement" | "relay";
  key: string;
  title: string;
  subtitle: string;
  artworkUrl: string;
  audioUrl: string;
  startedAt: string | null;
  durationMs: number;
  announcementBody: string;
  via: string;
  explicit: boolean;
  /** Livestream: nicht in die Datei springen. */
  live: boolean;
  youtubeId: string;
  recordingId: number | null;
};

export type ActiveRule = {
  id: number;
  title: string;
  endsAt: string;
  note: string;
};

export type StationSnapshot = {
  me: { id: string; name: string; email: string; role: DeskRole };
  wishesEnabled: boolean;
  explicitFilter: FilterMode;
  volume: number;
  outputTarget: OutputTarget;
  outputLabel: string;
  receiverConfigured: boolean;
  musicSource: "preview" | "spotify" | "archive";
  downvoteKick: number;
  wishPrune: WishPruneMode;
  wishPruneAt: number;
  monitorExternal: boolean;
  activeRule: ActiveRule | null;
  relay: { title: string; stationName: string; endsAt: string } | null;
  now: PlaybackView;
  queue: QueueItem[];
  history: { title: string; artist: string; at: string }[];
  budget: {
    up: number;
    down: number;
    upUsed: number;
    downUsed: number;
    queueLength: number;
  };
  openWishes: number;
  fallbackName: string;
};

export type RuleRecord = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  volume: number | null;
  wishesEnabled: boolean | null;
  explicitFilter: FilterMode | null;
  note: string;
  active: boolean;
};

export type PlaylistTrack = TrackInput & { id: number; position: number };

export type PlaylistRecord = {
  id: number;
  name: string;
  isFallback: boolean;
  tracks: PlaylistTrack[];
};

export type MemberRecord = {
  userId: string;
  displayName: string;
  email: string;
  role: DeskRole;
  mine: boolean;
};

export type AnnouncementRecord = {
  id: number;
  kind: string;
  title: string;
  body: string;
  status: string;
  airAt: string | null;
  createdByName: string;
  createdAt: string;
};

export type SettingsRecord = {
  wishesEnabled: boolean;
  explicitFilter: FilterMode;
  volume: number;
  outputTarget: OutputTarget;
  sonosRoom: string;
  sonosHost: string;
  receiverUrl: string;
  downvoteKick: number;
  wishPrune: WishPruneMode;
  wishPruneAt: number;
  extraBlocklist: string;
  musicSource: "preview" | "spotify" | "archive";
  spotifyClientId: string;
  moderatorEnabled: boolean;
  moderatorSlots: string;
  moderatorTopics: string;
  companyNotes: string;
  monitorExternal: boolean;
};

export type RelayStation = {
  id: number;
  name: string;
  streamUrl: string;
  note: string;
};

export type RelaySlot = {
  id: number;
  stationId: number;
  stationName: string;
  title: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export type RecordingRecord = {
  id: number;
  title: string;
  mime: string;
  durationMs: number;
  createdByName: string;
  createdAt: string;
};

export type DeskSnapshot = {
  me: { id: string; name: string; role: DeskRole };
  recordings: RecordingRecord[];
  stations: RelayStation[];
  slots: RelaySlot[];
};

export type AdminSnapshot = {
  settings: SettingsRecord;
  rules: RuleRecord[];
  playlists: PlaylistRecord[];
  members: MemberRecord[];
  announcements: AnnouncementRecord[];
  stations: RelayStation[];
  slots: RelaySlot[];
  nextSlot: string | null;
  suggestedReceiver: string;
};

export type RuleInput = {
  id?: number;
  title: string;
  startsAt: string;
  endsAt: string;
  volume: number | null;
  wishesEnabled: boolean | null;
  explicitFilter: FilterMode | null;
  note: string;
};

export type ProbeLine = {
  label: string;
  ok: boolean;
  detail: string;
};

export type OutputProbe = {
  ok: boolean;
  detail: string;
  lines: ProbeLine[];
  usingSaved: boolean;
};
