export interface Location {
  ID_LOCATION: number,
  LOCATION_NAME:string,
  OPENING_HOUR: string,
  CLOSING_HOUR: string,
  CANTON_NAME: string,
  PROVINCE_NAME: string,
  ID_PROVINCE: number;
};
export interface Canton {
  ID_CANTON: number;
  CANTON_NAME: string;
}

export interface Province {
  ID_PROVINCE:number;
  PROVINCE_NAME: string
}