import { describe, expect, it } from 'vitest';

import { cleanName, getNameAndIcon } from './deviceDetection';

type Objects = Parameters<typeof getNameAndIcon>[1];

function obj(type: ioBroker.ObjectType, name: ioBroker.StringOrTranslated): Objects[string] {
    return { _id: '', type, common: { name } as Objects[string]['common'], native: {} };
}

describe('getNameAndIcon', () => {
    it('takes the name of the channel, not the one of the folder of its room', () => {
        // 0_userdata.0.<room>.<device>.<state>: the folder is named like the room
        const objects: Objects = {
            '0_userdata.0.bad': obj('folder', { de: 'Bad', en: 'Bathroom' }),
            '0_userdata.0.bad.klima': obj('channel', { de: 'Bad Klima', en: 'Bathroom climate' }),
            '0_userdata.0.bad.klima.temperature': obj('state', { de: 'Temperatur', en: 'Temperature' }),
        };
        expect(getNameAndIcon('0_userdata.0.bad.klima.temperature', objects, 'de').name).toBe('Bad Klima');
    });

    it('takes the name of the device over the one of its channel', () => {
        const objects: Objects = {
            'hm-rpc.0.ABC': obj('device', 'Thermostat Wohnzimmer'),
            'hm-rpc.0.ABC.1': obj('channel', 'Thermostat Wohnzimmer:1'),
            'hm-rpc.0.ABC.1.SET_TEMPERATURE': obj('state', 'SET_TEMPERATURE'),
        };
        expect(getNameAndIcon('hm-rpc.0.ABC.1.SET_TEMPERATURE', objects, 'de').name).toBe('Thermostat Wohnzimmer');
    });

    it('takes the name of a folder that holds the state directly', () => {
        const objects: Objects = {
            '0_userdata.0.Licht': obj('folder', 'Deckenlampe'),
            '0_userdata.0.Licht.on': obj('state', 'on'),
        };
        expect(getNameAndIcon('0_userdata.0.Licht.on', objects, 'de').name).toBe('Deckenlampe');
    });

    it('falls back to the folder above when nothing below has a name', () => {
        const objects: Objects = {
            '0_userdata.0.lampe': obj('folder', 'Lampe'),
            '0_userdata.0.lampe.ch': obj('channel', ''),
            '0_userdata.0.lampe.ch.on': obj('state', ''),
        };
        expect(getNameAndIcon('0_userdata.0.lampe.ch.on', objects, 'de').name).toBe('Lampe');
    });
});

describe('cleanName', () => {
    it('removes the room from the name', () => {
        expect(cleanName('Bad Klima', 'Bad')).toBe('Klima');
        expect(cleanName('Wohnzimmer.Deckenlampe', 'Wohnzimmer')).toBe('Deckenlampe');
    });

    it('leaves nothing of a name that is only the room', () => {
        // detectDevices keeps the name then instead of falling back to the ID
        expect(cleanName('Bad', 'Bad')).toBe('');
        expect(cleanName('Bad')).toBe('Bad');
    });
});
