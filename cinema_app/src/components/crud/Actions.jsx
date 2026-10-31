import { ActionButton } from "./ActionButton";

export function Actions({onShow, onEdit, onDelete}) {

  return ({ row }) => [
    <ActionButton
      key="show"
      label="Mostrar"
      onClick={() => {onShow?.(row)}}
    />,
    <ActionButton
      key="edit"
      label="Mostrar"
      onClick={() => {onEdit?.(row)}}
    />,
    <ActionButton
      key="delete"
      label="Eliminar"
      onClick={() => {onDelete?.(row)}}
    />,
  ];
}