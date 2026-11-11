import { createPermissions } from '@/services/permissions';

// These labels support the template demo identity only.
// Live authorization and factory roles are not enabled in Phase 0.
export const PROFILES = {
  Admin_c: {
    label: 'Template demo admin',
    isDefault: false,
    isPublic: false,
    canManageTeam: true,
    reportsTo: null,
  },
  Viewer_c: {
    label: 'Viewer',
    isDefault: true,
    isPublic: false,
    canManageTeam: false,
    reportsTo: 'Admin_c',
  },
};

const TABLE_PERMISSIONS = {
  Admin_c: {},
  Viewer_c: {},
};

export const { getProfileMeta, getTableAccess, getFieldAccess } = createPermissions(
  PROFILES,
  TABLE_PERMISSIONS,
);
