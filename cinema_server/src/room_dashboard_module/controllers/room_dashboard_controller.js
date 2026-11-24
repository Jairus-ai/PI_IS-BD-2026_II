import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import {
  deleteStatusOverride,
  findAccessibleRoom,
  findAccessibleRooms,
  findActiveStatusOverride,
  findRoomScreenings,
  getDatabaseClock,
  saveStatusOverride
} from '../repositories/room_dashboard_repository.js';
import { buildFilters, buildRoomDashboard } from '../services/room_dashboard_service.js';
import { MANUAL_STATUS_MINUTES } from '../services/room_status_service.js';
import {
  parseRoomId,
  validateDashboardQuery,
  validateManualStatus
} from '../validators/room_dashboard_validator.js';

const ROOM_NOT_FOUND_MESSAGE = 'No se encontró la sala';
const UNIQUE_CONSTRAINT_ERROR = 1;

const roomNotFound = (res) => res.status(404).json({ message: ROOM_NOT_FOUND_MESSAGE });

export const getRoomDashboardFilters = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const rooms = await findAccessibleRooms(connection, req.user);
    res.status(200).json({ data: buildFilters(rooms) });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getRoomDashboard = async (req, res, next) => {
  const roomId = parseRoomId(req.params.roomId);
  if (!roomId) {
    return roomNotFound(res);
  }

  const { errors, date } = validateDashboardQuery(req.query);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let connection;
  try {
    connection = await getConnection();

    const room = await findAccessibleRoom(connection, req.user, roomId);
    if (!room) {
      return roomNotFound(res);
    }

    const clock = await getDatabaseClock(connection);
    const selectedDate = date ?? clock.today;
    const screeningRows = await findRoomScreenings(connection, roomId, selectedDate);
    const override = await findActiveStatusOverride(connection, roomId);

    res.status(200).json({
      data: buildRoomDashboard({ room, clock, date: selectedDate, screeningRows, override })
    });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const setRoomStatus = async (req, res, next) => {
  const roomId = parseRoomId(req.params.roomId);
  if (!roomId) {
    return roomNotFound(res);
  }

  const { errors, status } = validateManualStatus(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let connection;
  try {
    connection = await getConnection();

    const room = await findAccessibleRoom(connection, req.user, roomId);
    if (!room) {
      return roomNotFound(res);
    }

    await saveStatusOverride(connection, {
      roomId,
      status,
      workerId: req.user.id,
      minutes: MANUAL_STATUS_MINUTES
    });
    await connection.commit();

    res.status(200).json({ message: 'Estado de la sala actualizado', data: { status } });
  } catch (error) {
    if (error.errorNum === UNIQUE_CONSTRAINT_ERROR) {
      return res.status(409).json({ message: 'El estado de la sala se está actualizando, intenta de nuevo' });
    }
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const clearRoomStatus = async (req, res, next) => {
  const roomId = parseRoomId(req.params.roomId);
  if (!roomId) {
    return roomNotFound(res);
  }

  let connection;
  try {
    connection = await getConnection();

    const room = await findAccessibleRoom(connection, req.user, roomId);
    if (!room) {
      return roomNotFound(res);
    }

    await deleteStatusOverride(connection, roomId);
    await connection.commit();

    res.status(200).json({ message: 'La sala volvió al estado automático' });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};