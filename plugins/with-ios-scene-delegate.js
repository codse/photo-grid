/**
 * Ship SceneDelegate.swift into CNG / EAS prebuild.
 *
 * Gotcha: `ios/` is gitignored. Declaring UIApplicationSceneManifest in
 * app.json without this plugin leaves Info.plist pointing at a missing
 * `SceneDelegate` class → empty scene window → permanent black screen after
 * splash (RN may still start in an orphan AppDelegate window).
 *
 * Mirrors expo main's ExpoAppSceneDelegate pattern for SDK 57 (class not
 * shipped in expo@57.0.10 yet).
 */
const {
  withDangerousMod,
  withXcodeProject,
  IOSConfig,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SCENE_DELEGATE_SRC = `import React
import UIKit

/**
 UIScene entry point. Required when Info.plist declares UIApplicationSceneManifest.
 Without this class in the binary, UIKit shows an empty (black) window while
 React Native may be running in a non-key AppDelegate window.
 */
@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory
    else {
      fatalError(
        "SceneDelegate could not find AppDelegate.reactNativeFactory. "
          + "Create the factory in application(_:didFinishLaunchingWithOptions:)."
      )
    }

    let window = UIWindow(windowScene: windowScene)
    // Cream brand ground if Fabric stalls between splash hide and first commit.
    window.backgroundColor = UIColor(red: 1, green: 0.988, blue: 0.976, alpha: 1) // #FFFCF9
    self.window = window
    appDelegate.window = window

    // Rebuild launch options so Linking.getInitialURL() sees cold-start URLs
    // (scene lifecycle does not pass them to AppDelegate launchOptions).
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")] = url
    }
    if let activity = connectionOptions.userActivities.first(where: {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }) {
      launchOptions[
        UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey")
      ] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity,
      ]
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions.isEmpty ? nil : launchOptions
    )

    for context in connectionOptions.urlContexts {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: [:]
      )
    }
    for activity in connectionOptions.userActivities {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        continue: activity,
        restorationHandler: { _ in }
      )
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: [:]
      )
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
`;

const APP_DELEGATE_SRC = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Window + React Native start live in SceneDelegate when
    // UIApplicationSceneManifest is present (see plugins/with-ios-scene-delegate.js).
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options)
      || RCTLinkingManager.application(app, open: url, options: options)
  }

  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
    return super.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    ) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`;

/** @param {import('expo/config-plugins').XcodeProject} project */
function projectHasSwiftFile(project, filePath) {
  const files = project.hash?.project?.objects?.PBXFileReference ?? {};
  return Object.values(files).some(
    (f) =>
      typeof f === 'object' &&
      f != null &&
      typeof f.path === 'string' &&
      (f.path === filePath || f.path.endsWith(`/${filePath}`) || f.path === path.basename(filePath))
  );
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withIosSceneDelegate(config) {
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
      const dir = path.join(cfg.modRequest.platformProjectRoot, projectName);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SceneDelegate.swift'), SCENE_DELEGATE_SRC);
      fs.writeFileSync(path.join(dir, 'AppDelegate.swift'), APP_DELEGATE_SRC);
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const filePath = path.join(projectName, 'SceneDelegate.swift');
    if (!projectHasSwiftFile(project, 'SceneDelegate.swift')) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: filePath,
        groupName: projectName,
        project,
      });
    }
    return cfg;
  });

  return config;
}

module.exports = withIosSceneDelegate;
