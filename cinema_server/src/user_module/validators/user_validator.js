import { ROLES } from '../../session/session.js';
import { normalizeUserData, validateUserData} from '../../shared/validators/user_data_validator.js';

const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';

const ALLOWED_ROLES_BY_CREATOR = {
  [ROLES.SUPERUSER]: [
    ROLES.CLIENT,
    ROLES.EMPLOYEE,
    ROLES.ADMINISTRATOR
  ],
  [ROLES.ADMINISTRATOR]: [
    ROLES.CLIENT,
    ROLES.EMPLOYEE
  ],
  [ROLES.EMPLOYEE]: [
    ROLES.CLIENT
  ]
};

function normalizeRole(role) {
  return typeof role === 'string'
    ? role.trim().toUpperCase()
    : '';
}

function normalizeLocations(locations) {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations
    .map(Number)
    .filter((locationId) => Number.isInteger(locationId) && locationId > 0);
}

function validateRole(errors, creatorRole, targetRole) {
  if (!targetRole) {
    errors.role = REQUIRED_FIELD_MESSAGE;
    return;
  }

  const allowedRoles = ALLOWED_ROLES_BY_CREATOR[creatorRole] ?? [];

  if (!allowedRoles.includes(targetRole)) {
    errors.role = 'No tienes permisos para registrar usuarios con este rol';
  }
}

function validateLocations(errors, targetRole, locations) {
  const requiresLocations =
    targetRole === ROLES.EMPLOYEE
    || targetRole === ROLES.ADMINISTRATOR;

  if (requiresLocations && locations.length === 0) {
    errors.locations =
      'Debes seleccionar al menos una sucursal';
  }
}

export function validateUserRegistration(creatorRole, body = {}) {
  const user = normalizeUserData(body);
  const errors = validateUserData(user);

  const role = normalizeRole(body.role);
  const locations = normalizeLocations(body.locations);

  validateRole(errors, creatorRole, role);
  validateLocations(errors, role, locations);

  return {
    errors,
    user,
    role,
    locations
  };
}