import React from 'react';
import { DataLinksInlineEditor} from '@grafana/ui';
import { VariableSuggestion, DataLink, DataLinksFieldConfigSettings, StandardEditorProps, StandardEditorContext, VariableSuggestionsScope } from '@grafana/data';
import { css } from '@emotion/css';


// filter out suggestions that we don't support
type getSuggestionsFunc = () => VariableSuggestion[]
const DataLinkEditorWarning: React.FC<{
    links: Array<DataLink<any>>
}> = ({ links}) => {
    let msg = "";
    let prefix ="";
    if (links.length > 1) {
        prefix ="⚠"
        msg = "more than one link is not supported for cubism";
    } else if (links.length === 1) {
        let url = links[0].url
        const pattern = /\${[^}]*}/g;
        const extractedVariables: string[] = url.match(pattern)!;
        let unsupported: string[] = [];
        for (let j = 0; j < extractedVariables.length; j++) {
            if (!extractedVariables[j].slice(2, -1).startsWith('__field.labels')) {
                unsupported.push(extractedVariables[j])
            }
        }
        if (unsupported.length > 0) {
            prefix ="⚠"
            msg = "only __field.labels variables are supported";
        }
    }
    let stylePrefix = css` background-color: red`
    let styleMessage = css`color: red`
    if (msg.length > 0) {
        msg = " " + msg
    }
    return (
        <div><span className={stylePrefix}>{prefix}</span><span className={styleMessage}>{msg}</span></div>
    );
}
type Props = StandardEditorProps<DataLink[], DataLinksFieldConfigSettings>;
export const DataLinksEditor = ({ value, onChange, context }: Props) => {
    return (
        <div>
        <DataLinkEditorWarning links={value}/>
        <DataLinksInlineEditor
            links={value}
            onChange={onChange}
            data={context.data}
            getSuggestions={getSuggestionner(context)}
        />
        </div>
    );
};
const getSuggestionner = (ctx:  StandardEditorContext<any, any> ): getSuggestionsFunc => {
    return () => {
        if (ctx.getSuggestions) {
            let suggestions = ctx.getSuggestions(VariableSuggestionsScope.Values);
            suggestions = suggestions.filter((s) => { return s.value.startsWith('__field.labels')});
            return suggestions;
        } else {
            return  []
        }
    }
}
export const exportedForTest = {
    getSuggestionner,
    DataLinkEditorWarning
}
