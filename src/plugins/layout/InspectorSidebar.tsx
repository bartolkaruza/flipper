/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  ManagedDataInspector,
  Panel,
  FlexCenter,
  styled,
  colors,
  PluginClient,
  SidebarExtensions,
  Element,
} from 'flipper';
import Client from '../../Client';
import {Logger} from '../../fb-interfaces/Logger';
import {Component} from 'react';
import deepEqual from 'deep-equal';
import React from 'react';

const NoData = styled(FlexCenter)({
  fontSize: 18,
  color: colors.macOSTitleBarIcon,
});

type OnValueChanged = (path: Array<string>, val: any) => void;

type InspectorSidebarSectionProps = {
  data: any;
  id: string;
  onValueChanged: OnValueChanged | null;
  tooltips?: Object;
};

class InspectorSidebarSection extends Component<InspectorSidebarSectionProps> {
  setValue = (path: Array<string>, value: any) => {
    if (this.props.onValueChanged) {
      this.props.onValueChanged([this.props.id, ...path], value);
    }
  };

  shouldComponentUpdate(nextProps: InspectorSidebarSectionProps) {
    return (
      !deepEqual(nextProps, this.props) ||
      this.props.id !== nextProps.id ||
      this.props.onValueChanged !== nextProps.onValueChanged
    );
  }

  extractValue = (val: any, _depth: number) => {
    if (val && val.__type__) {
      return {
        mutable: Boolean(val.__mutable__),
        type: val.__type__ === 'auto' ? typeof val.value : val.__type__,
        value: val.value,
      };
    } else {
      return {
        mutable: typeof val === 'object',
        type: typeof val,
        value: val,
      };
    }
  };

  render() {
    const {id} = this.props;
    return (
      <Panel heading={id} floating={false} grow={false}>
        <ManagedDataInspector
          data={this.props.data}
          setValue={this.props.onValueChanged ? this.setValue : undefined}
          extractValue={this.extractValue}
          expandRoot={true}
          collapsed={true}
          tooltips={this.props.tooltips}
        />
      </Panel>
    );
  }
}

type Props = {
  element: Element | null;
  tooltips?: Object;
  onValueChanged: OnValueChanged | null;
  client: PluginClient;
  realClient: Client;
  logger: Logger;
};

export default class Sidebar extends Component<Props> {
  render() {
    const {element} = this.props;
    if (!element || !element.data) {
      return <NoData grow>No data</NoData>;
    }

    const sections: Array<any> =
      (SidebarExtensions &&
        SidebarExtensions.map(ext =>
          ext(
            this.props.client,
            this.props.realClient,
            element.id,
            this.props.logger,
          ),
        )) ||
      [];

    for (const key in element.data) {
      if (key === 'Extra Sections') {
        for (const extraSection in element.data[key]) {
          const section = element.data[key][extraSection];
          let data = {};

          // data might be sent as stringified JSON, we want to parse it for a nicer persentation.
          if (typeof section === 'string') {
            try {
              data = JSON.parse(section);
            } catch (e) {
              // data was not a valid JSON, type is required to be an object
              console.error(
                `ElementsInspector unable to parse extra section: ${extraSection}`,
              );
              data = {};
            }
          } else {
            data = section;
          }
          sections.push(
            <InspectorSidebarSection
              tooltips={this.props.tooltips}
              key={extraSection}
              id={extraSection}
              data={data}
              onValueChanged={this.props.onValueChanged}
            />,
          );
        }
      } else {
        sections.push(
          <InspectorSidebarSection
            tooltips={this.props.tooltips}
            key={key}
            id={key}
            data={element.data[key]}
            onValueChanged={this.props.onValueChanged}
          />,
        );
      }
    }

    return sections;
  }
}
