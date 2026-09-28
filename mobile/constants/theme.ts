/**
 * Playmaker FC design system.
 * Dark navy + red, compact and practical — matching the existing attendance
 * app's look and feel, redesigned as a clean modern React Native UI.
 */

export const colors = {
  // Backgrounds
  bg: "#0B1220",
  bgElevated: "#111A2C",
  card: "#161F33",
  cardBorder: "#232E47",
  surfaceLight: "#F5F6FA",

  // Brand
  primary: "#E31E24", // red
  primaryDark: "#B3161B",
  primarySoft: "#3A1418",

  // Text
  textPrimary: "#F5F6FA",
  textSecondary: "#9AA5B8",
  textMuted: "#6B7488",
  textOnLight: "#111A2C",

  // Status
  present: "#22C55E",
  presentSoft: "#123521",
  absent: "#E31E24",
  absentSoft: "#3A1418",
  unmarked: "#F5A623",
  unmarkedSoft: "#3A2E10",
  warning: "#F5A623",
  error: "#E31E24",
  info: "#3B82F6",

  white: "#FFFFFF",
  black: "#000000",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 24, fontWeight: "700" as const },
  h2: { fontSize: 19, fontWeight: "700" as const },
  h3: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  bodyBold: { fontSize: 14, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
  captionBold: { fontSize: 12, fontWeight: "700" as const },
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
};

export function statusColor(status: "PRESENT" | "ABSENT" | "UNMARKED") {
  switch (status) {
    case "PRESENT":
      return colors.present;
    case "ABSENT":
      return colors.absent;
    default:
      return colors.unmarked;
  }
}

export function statusSoftColor(status: "PRESENT" | "ABSENT" | "UNMARKED") {
  switch (status) {
    case "PRESENT":
      return colors.presentSoft;
    case "ABSENT":
      return colors.absentSoft;
    default:
      return colors.unmarkedSoft;
  }
}

export function feeStatusColor(status: "PAID" | "PENDING" | "PARTIAL") {
  switch (status) {
    case "PAID":
      return colors.present;
    case "PARTIAL":
      return colors.unmarked;
    default:
      return colors.absent;
  }
}
