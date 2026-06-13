import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host machine localhost
//const HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

//const HOST = '10.174.158.253';


const HOST = '192.168.1.100';

export const API_BASE_URL = `http://${HOST}:8000/api`;
