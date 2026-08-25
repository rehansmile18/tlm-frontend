/**
 * Which of the two sibling frontends this build is. Deliberately its own module: it is the one
 * fact that genuinely differs between the apps, and isolating it here lets everything that merely
 * *consumes* it (the app switcher, and anything added later) stay byte-identical across both
 * repos rather than forking over a single boolean.
 */
export const THIS_APP = "ruleRepositoryApp" as const;
export const OTHER_APP_URL = process.env.NEXT_PUBLIC_SITE_OPS_APP_URL;
