import { ActionButton } from "./ActionButton";

export function Actions({
  onShow,
  onEdit,
  onDelete,
} : {
  readonly onShow: (row: any) => void,
  readonly onEdit: (row: any) => void,
  readonly onDelete: (row: any) => void,

}) {

  return ({ row } : { row: any }) => [
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