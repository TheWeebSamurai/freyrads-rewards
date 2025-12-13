import axios from 'axios';
import config from '../../config.js';
import { server } from 'typescript';

export class Lootlabs {
    
    async createLink(code: string) {
        let server_url = config.server_url;
        let reward_url = `${server_url}/rewards/${code}`
        let request = await axios.post("https://creators.lootlabs.gg/api/public/url_encryptor", {
            destination_url: reward_url,
        }, {headers: {"Authorization": config.lootlabs_api_token}})
        console.log(request.data);
        const link = `https://loot-link.com/s?1LGwiH7Q&data=${request.data.message}`;
        return link
    }
}