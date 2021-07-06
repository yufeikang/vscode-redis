import { ClientV2 } from '@camaro/redis';
import { ThemeIcon, TreeItemCollapsibleState, Command as VSCCommand, window } from 'vscode';
import PanelName from '../common/panelName';
import { TreeItemContextValue } from '../common/treeItemContextValue';
import DBItem from './db';
import Element from './element';

interface KeyDetail {
    type: PanelName,
    data: {
        id: string,
        key: string,
        value: unknown,
        ttl: number
    }
}

export default class KeyItem extends Element {
    command: VSCCommand = {
        title: 'View',
        tooltip: 'Click',
        command: 'Redis.Key.Detail',
        arguments: []
    };

    contextValue = TreeItemContextValue.KEY;
    iconPath = new ThemeIcon('key');
    constructor(
        readonly id: string,
        public label: string,
        readonly client: ClientV2,
        private parent: DBItem
    ) {
        super(label, TreeItemCollapsibleState.None);
        this.command.arguments?.push(this);
    }

    async detail(): Promise<KeyDetail> {
        this.client.SELECT(this.parent.index);
        const type = await this.client.TYPE(this.label);
        const ttl = await this.client.TTL(this.label);

        let data;
        switch (type) {
            case PanelName.STRING:
                data = await this.client.GET(this.label);
                break;
            default:
                window.showErrorMessage(`Unsupport data type: ${type}.`);
                throw Error();
        }

        return {
            type,
            data: {
                id: this.id,
                key: this.label,
                value: data,
                ttl
            }
        };
    }

    getChildren(): Promise<Element[]> {
        throw new Error('Method not implemented.');
    }

    async rename(): Promise<boolean> {
        const newkey = await window.showInputBox({
            prompt: 'Rename key',
            value: this.label,
        });
        if (newkey === undefined) {
            return false;
        }
        this.client.SELECT(this.parent.index);
        await this.client.RENAME(this.label, newkey);
        // Modify `this.label` to `newkey` for future use.
        this.label = newkey;
        this.parent.refresh();
        return true;
    }

    async expire(ttl: string): Promise<boolean> {
        const newttl = await window.showInputBox({
            prompt: 'Set key TTL',
            value: ttl,
        });
        if (newttl === undefined) {
            return false;
        }
        this.client.SELECT(this.parent.index);
        await this.client.EXPIRE(this.label, parseInt(newttl));
        this.parent.refresh();
        return true;
    }

    async delete(): Promise<boolean> {
        const res = await window.showInformationMessage(
            'Do you really want to delete this key?',
            'Yes', 'No'
        );

        if (res === 'Yes') {
            this.client.SELECT(this.parent.index);
            await this.client.DEL(this.label);
            this.parent.refresh();
            return true;
        }
        return false;
    }
}