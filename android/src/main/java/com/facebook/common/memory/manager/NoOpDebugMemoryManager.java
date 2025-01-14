/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * <p>This source code is licensed under the MIT license found in the LICENSE file in the root
 * directory of this source tree.
 */
package com.facebook.common.memory.manager;

public class NoOpDebugMemoryManager implements DebugMemoryManager {

  @Override
  public void trimMemory(int trimType) {}
}
