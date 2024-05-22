import React from 'react';
import {  render } from '@testing-library/react';

import { RegistryItem, StandardEditorContext, DataLink } from '@grafana/data';
import { DataLinksEditor, exportedForTest } from '../components/DataLinksEditor';
const { getSuggestionner, DataLinkEditorWarning } = exportedForTest;
describe('getSuggestionner', () => {
    it('returns an empty array is not context suggestions ', () => {
      const mockCtx: StandardEditorContext<any, any> = {
          data: []
        };

        const getSuggestions = getSuggestionner(mockCtx)();
        expect(getSuggestions).toHaveLength(0);
    });
    it('filters out suggestions correctly', () => {
        const mockCtx = {
            data: [],
            getSuggestions: jest.fn().mockReturnValue([
                { value: '__field.labels.mylabel1' },
                { value: '__another.label' },
                { value: 'something else' }
            ])
        };

        const getSuggestions = getSuggestionner(mockCtx)();
        expect(getSuggestions).toHaveLength(1);
        expect(getSuggestions[0].value).toBe('__field.labels.mylabel1');
    });
});

describe('DataLinkEditorWarning', () => {
    it('displays warning message if multiple links present', () => {
      const links = [{ url: 'http://example.com', title: 'foo1' }, { url: 'http://another.com', title: 'foo2' }];
      const { getByText } = render(<DataLinkEditorWarning links={links}/>);
      const warningMessage = getByText(/more than one link is not supported/i);
      // @ts-ignore
      expect(warningMessage).toBeInTheDocument();
    });
    it('displays warning message for unsupported variables', () => {
      const links = [{ url: 'http://example.com/${__field.other.var1}', title: 'foo1' }];
      const { getByText } = render(<DataLinkEditorWarning links={links}/>);
      const warningMessage = getByText(/only __field.labels variables are supported/i);
      // @ts-ignore
      expect(warningMessage).toBeInTheDocument();
    });
    it('displays nothing when there is supported variables', () => {
      const links = [{ url: 'http://example.com/${__field.labels.var1}', title: 'foo1' }];
      const { getAllByText } = render(<DataLinkEditorWarning links={links}/>);
      expect((getAllByText(/.*/)[4].children.length)).toBe(0)
    });
});
describe('DataLinkEditor', () => {
    it('displays warning message for unsupported variables', () => {
        const mockCtx = {
            data: [],
            getSuggestions: jest.fn().mockReturnValue([
                { value: '__field.labels.mylabel1' },
                { value: '__another.label' },
                { value: 'something else' }
            ])
        };
      const mockOnChange = (links?: Array<DataLink<any>>) => { return };
      const links = [{ url: 'http://example.com/${__field.other.var1}', title: 'foo1' }];
      const item: RegistryItem = {
        id: "12",
        name: "fake",
        }
      const prop = {
        value: links,
        onChange: mockOnChange,
        context: mockCtx,
        item:  item
      }
      const { getByText } = render(<DataLinksEditor {...prop}/> );
      const warningMessage = getByText(/only __field.labels variables are supported/i);
      // @ts-ignore
      expect(warningMessage).toBeInTheDocument();
    });
    it('displays nothing for supported variables', () => {
        const mockCtx = {
            data: [],
            getSuggestions: jest.fn().mockReturnValue([
                { value: '__field.labels.mylabel1' },
                { value: '__another.label' },
                { value: 'something else' }
            ])
        };
      const mockOnChange = (links?: Array<DataLink<any>>) => { return };
      const links = [{ url: 'http://example.com/${__field.labels.var1}', title: 'foo1' }];
      const item: RegistryItem = {
        id: "12",
        name: "fake",
        }
      const prop = {
        value: links,
        onChange: mockOnChange,
        context: mockCtx,
        item:  item
      }
      const { getByText } = render(<DataLinksEditor {...prop}/> );
      const linkMessage = getByText(/add link/i);
      // @ts-ignore
      expect(linkMessage).toBeInTheDocument();
    });
});
