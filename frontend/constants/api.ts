import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host machine localhost
//const HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

//const HOST = '10.174.158.253';
//const HOST = '10.18.98.66';

const HOST = 'nobannoapp.online';

export const API_BASE_URL = `https://${HOST}/api`;
