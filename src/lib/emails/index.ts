export { buildWelcomeRetailEmail } from "@/lib/emails/welcome-retail";
export { buildWholesaleRequestReceivedEmail } from "@/lib/emails/wholesale-request-received";
export { buildWholesaleApprovedEmail } from "@/lib/emails/wholesale-approved";
export { buildVerifyEmailCodeEmail } from "@/lib/emails/verify-email-code";
export { buildPasswordResetEmail } from "@/lib/emails/password-reset";
export { buildPasswordChangedEmail } from "@/lib/emails/password-changed";
export {
  buildEmailChangedOldEmail,
  buildEmailChangedNewEmail,
} from "@/lib/emails/email-changed";
export { buildNewsletterEmail } from "@/lib/emails/newsletter";
export { buildBirthdayEmail } from "@/lib/emails/birthday";
export { buildOrderHandedToCarrierEmail } from "@/lib/emails/order-handed-to-carrier";
export { sendBrevoEmail, sendBrevoTemplateEmail } from "@/lib/emails/brevo";
export {
  emailPreviewCatalog,
  getEmailPreviewById,
} from "@/lib/emails/catalog";
export type {
  EmailTemplate,
  WelcomeRetailEmailVars,
  WholesaleRequestReceivedEmailVars,
  WholesaleApprovedEmailVars,
  VerifyEmailCodeEmailVars,
  PasswordResetEmailVars,
  PasswordChangedEmailVars,
  EmailChangedOldEmailVars,
  EmailChangedNewEmailVars,
  NewsletterEmailVars,
  NewsletterProductCard,
  BirthdayEmailVars,
  OrderHandedToCarrierEmailVars,
} from "@/lib/emails/types";
export type { EmailPreviewDefinition } from "@/lib/emails/catalog";
export { EMAIL_BRAND } from "@/lib/emails/brand";
