const noop = async () => {};

const ExpoKeepAwakeTag = "ExpoKeepAwakeDefaultTag";

function useKeepAwake() {}

function activateKeepAwake(tag = ExpoKeepAwakeTag) {
  return activateKeepAwakeAsync(tag);
}

async function activateKeepAwakeAsync() {
  return noop();
}

async function deactivateKeepAwake() {
  return noop();
}

function isAvailableAsync() {
  return Promise.resolve(false);
}

function addListener() {
  return {
    remove() {},
  };
}

module.exports = {
  ExpoKeepAwakeTag,
  useKeepAwake,
  activateKeepAwake,
  activateKeepAwakeAsync,
  deactivateKeepAwake,
  isAvailableAsync,
  addListener,
};
