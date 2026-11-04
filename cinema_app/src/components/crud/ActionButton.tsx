import Box from "@mui/material/Box";
import { GridActionsCellItem } from '@mui/x-data-grid';

export function ActionButton({
  key,
  label,
  onClick
} : {
  readonly key: string,
  readonly label: string,
  readonly onClick: (row: any) => void,
}) {
  return (
    <GridActionsCellItem
      key={key}
      icon={
        <Box
          component="span"
          sx={{
            fontSize: '1rem',
            fontWeight: 500,
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'primary.main',
            borderRadius: '4px',
            padding: '0.2rem',
            width: '5rem'
          }}
        >
          {label}
        </Box>
      }
      label={label}
      onClick={onClick}
      showInMenu={false}
    />
  )
}