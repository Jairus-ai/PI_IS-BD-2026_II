import { ActionButton } from "./ActionButton";
import {CheckUserSession} from '../common/RequireSession';
import { MANAGER_ROLES } from '../../context/SessionContext';

export function Actions({
  onShow,
  onEdit,
  onDelete,
} : {
  readonly onShow: (row: any) => void,
  readonly onEdit: (row: any) => void,
  readonly onDelete: (row: any) => void,

}) {

  const hide = CheckUserSession( MANAGER_ROLES );


  if(!hide)
  {
    return (
      { row } : { row: any }) => [
      <ActionButton

        key="show"
        label="Mostrar"
        onClick={() => {onShow?.(row)}}
      />,
    ];
  }else
  {
    return (
      { row } : { row: any }) => [
      <ActionButton

        key="show"
        label="Mostrar"
        onClick={() => {onShow?.(row)}}
      />,
      <ActionButton
        key="edit"
        label="Modificar"
        onClick={() => {onEdit?.(row)}}
      />,
      <ActionButton
        key="delete"
        label="Eliminar"
        onClick={() => {onDelete?.(row)}}
      />,
    ];
  }

}