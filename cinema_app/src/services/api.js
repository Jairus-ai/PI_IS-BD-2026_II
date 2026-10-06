import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_APP_URL;

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});