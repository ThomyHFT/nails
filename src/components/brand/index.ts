/**
 * Sistema de diseño de marca.
 *
 * Traduce los mockups de Stitch a piezas reutilizables sobre los tokens que ya
 * resuelve el SPEC 04: cada componente lee `--primary`, `--surface-*` y
 * `--radius` del tenant activo, así que la misma pieza se ve Minimal Nude,
 * Glam, Editorial o Pastel sin ramas por arquetipo.
 *
 * Regla: son presentacionales. No importan nada de `server/`, no hacen fetch y
 * no conocen el dominio — reciben datos ya resueltos.
 */

export {
  Body,
  BodyLarge,
  Caption,
  Display,
  Eyebrow,
  Headline,
  Overline,
  Price,
  SectionHeading,
  Title,
} from "@/components/brand/typography";

export { ActionLink, BrandButton, CircleButton } from "@/components/brand/button";

export { Band, Container, Divider, IconCircle, MediaFrame, Panel, Section } from "@/components/brand/surface";

export { Chip, MetaItem, StatusBadge } from "@/components/brand/chip";

export { AuthCard, FIELD_CLASSES, TextField } from "@/components/brand/form";

export { OptionCard, RatingInput, SegmentedControl, SelectChip, Swatch } from "@/components/brand/controls";

export { RatingStars, RatingSummary, ReviewCard, ReviewStatusChip } from "@/components/brand/review";

export { ServiceCard, VariantRow, type ServiceCardData } from "@/components/brand/service-card";

export {
  ContactCard,
  EmptyState,
  FloatingStat,
  GalleryGrid,
  Hero,
  SiteFooter,
} from "@/components/brand/marketing";

export {
  BookingSummaryCard,
  InfoNote,
  NoteField,
  StickyActionBar,
  SummaryRow,
} from "@/components/brand/booking";

export {
  AdminAside,
  AdminCard,
  AdminPageHeader,
  AppointmentRow,
  SidebarItem,
  StatCard,
} from "@/components/brand/admin";

export { AppHeader, BottomNavBar, type NavItem } from "@/components/brand/navigation";
