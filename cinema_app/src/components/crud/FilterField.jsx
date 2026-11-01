import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

export function FilterField({
  label,
  name,
  value,
  onChange,
  itemList,
  getValue,
  getLabel,
  minWidth = 160,
}) {
  return (
    <FormControl
      size="small"
      sx={{ minWidth }}
    >
      <InputLabel>
        {label}
      </InputLabel>

      <Select
        label={label}
        name={name}
        value={value}
        onChange={onChange}
      >
        <MenuItem value="">
          Ningún {label} seleccionado
        </MenuItem>

        {itemList.map((item) => (
          <MenuItem
            key={getValue(item)}
            value={getValue(item)}
          >
            {getLabel(item)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
