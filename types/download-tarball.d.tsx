/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

declare module 'download-tarball' {
  export default function(options: {
    url: string;
    dir: string;
    gotOpts?: any;
  }): Promise<void>;
}
