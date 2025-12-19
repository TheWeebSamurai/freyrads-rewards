import axios from 'axios';
import config from '../../config.js';
import { server } from 'typescript';
import { redis } from '../redis.js';
import {randomUUID} from 'node:crypto'

export class Lootlabs {
    
    async createLink(code: string) {
        let server_url = config.testing_url;
        
        let randomCode = randomUUID()
        let reward_url = `${server_url}/rewards/discord/sessions/${randomCode}`
        let test_redis = await redis.set(`session:${randomCode}`, code, 1000 * 60 * 15)
        let request = await axios.post("https://creators.lootlabs.gg/api/public/url_encryptor", {
            destination_url: reward_url,
        }, {headers: {"Authorization": config.lootlabs_api_token}})
        console.log(request.data);
        const link = `https://loot-link.com/s?1LGwiH7Q&data=${request.data.message}&puid=${randomCode}`;
        return link
    }
}