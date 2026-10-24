/// Direct ESC/POS transports (F2 §8, carried from F1): Bluetooth
/// SPP and USB-OTG delivery of the same raster bytes the share
/// path produces, behind the ReceiptPrinter seam.
///
/// Graceful absence is the contract: no printer configured, the
/// device gone, Bluetooth off, or any platform error → the call
/// throws a StateError and the caller falls back to the share
/// sheet (.bin) path. Nothing here is device-verified (no printer
/// exists in the build environment); the Dart side is analyze-
/// checked against the plugins' published APIs.
///
/// The selection is DEVICE-LOCAL (design §5.2): SharedPreferences,
/// never Firestore — a printer belongs to one counter device.
import 'dart:io';
import 'dart:typed_data';

import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:usb_serial/usb_serial.dart';

import 'printing.dart';

/// The persisted direct-printer selection.
class DirectPrinterConfig {
  final String transport; // 'bluetooth' | 'usb'
  final String label;
  final String? mac; // bluetooth
  final int? vid; // usb
  final int? pid; // usb
  const DirectPrinterConfig({required this.transport, required this.label, this.mac, this.vid, this.pid});
}

class PrinterSettings {
  static const _kTransport = 'pos.transport';
  static const _kLabel = 'pos.label';
  static const _kMac = 'pos.btMac';
  static const _kVid = 'pos.usbVid';
  static const _kPid = 'pos.usbPid';

  static Future<DirectPrinterConfig?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final transport = prefs.getString(_kTransport);
    if (transport == null) return null;
    return DirectPrinterConfig(
      transport: transport,
      label: prefs.getString(_kLabel) ?? transport,
      mac: prefs.getString(_kMac),
      vid: prefs.getInt(_kVid),
      pid: prefs.getInt(_kPid),
    );
  }

  static Future<void> save(DirectPrinterConfig? config) async {
    final prefs = await SharedPreferences.getInstance();
    if (config == null) {
      await prefs.remove(_kTransport);
      await prefs.remove(_kLabel);
      await prefs.remove(_kMac);
      await prefs.remove(_kVid);
      await prefs.remove(_kPid);
      return;
    }
    await prefs.setString(_kTransport, config.transport);
    await prefs.setString(_kLabel, config.label);
    if (config.mac != null) await prefs.setString(_kMac, config.mac!);
    if (config.vid != null) await prefs.setInt(_kVid, config.vid!);
    if (config.pid != null) await prefs.setInt(_kPid, config.pid!);
  }
}

/// Paired Bluetooth printers (empty off-Android or on any error —
/// absence is a normal state, never a crash).
Future<List<BluetoothInfo>> pairedBluetoothPrinters() async {
  if (!Platform.isAndroid) return const [];
  try {
    if (!await PrintBluetoothThermal.bluetoothEnabled) return const [];
    return await PrintBluetoothThermal.pairedBluetooths;
  } catch (_) {
    return const [];
  }
}

/// Attached USB devices (empty off-Android or on any error).
Future<List<UsbDevice>> attachedUsbDevices() async {
  if (!Platform.isAndroid) return const [];
  try {
    return await UsbSerial.listDevices();
  } catch (_) {
    return const [];
  }
}

/// The configured direct printer, or null when none is selected
/// (→ the caller uses the share fallback).
Future<ReceiptPrinter?> configuredDirectPrinter() async {
  final config = await PrinterSettings.load();
  if (config == null) return null;
  return switch (config.transport) {
    'bluetooth' => BluetoothDirectPrinter(config),
    'usb' => UsbDirectPrinter(config),
    _ => null,
  };
}

/// Bluetooth SPP delivery (print_bluetooth_thermal).
class BluetoothDirectPrinter implements ReceiptPrinter {
  final DirectPrinterConfig config;
  const BluetoothDirectPrinter(this.config);

  @override
  String get id => 'escpos-bluetooth';

  @override
  Future<void> printPng(Uint8List pngBytes, {required String jobName, required bool thermal}) async {
    if (!Platform.isAndroid) throw StateError('bluetooth printing is Android-only');
    final mac = config.mac;
    if (mac == null || mac.isEmpty) throw StateError('no bluetooth printer configured');
    if (!await PrintBluetoothThermal.bluetoothEnabled) {
      throw StateError('bluetooth is off');
    }
    final bytes = await escPosRasterBytes(pngBytes);
    if (!await PrintBluetoothThermal.connectionStatus) {
      final connected = await PrintBluetoothThermal.connect(macPrinterAddress: mac);
      if (!connected) throw StateError('bluetooth printer not reachable');
    }
    final written = await PrintBluetoothThermal.writeBytes(bytes);
    if (!written) throw StateError('bluetooth write failed');
  }
}

/// USB-OTG delivery (usb_serial). The port is opened per job and
/// closed after — thermal printers tolerate this well and it
/// avoids holding the device across the app's life.
class UsbDirectPrinter implements ReceiptPrinter {
  final DirectPrinterConfig config;
  const UsbDirectPrinter(this.config);

  @override
  String get id => 'escpos-usb';

  @override
  Future<void> printPng(Uint8List pngBytes, {required String jobName, required bool thermal}) async {
    if (!Platform.isAndroid) throw StateError('usb printing is Android-only');
    final devices = await UsbSerial.listDevices();
    final device = devices.where((d) => d.vid == config.vid && d.pid == config.pid).firstOrNull;
    if (device == null) throw StateError('usb printer not attached');
    final port = await device.create();
    if (port == null) throw StateError('usb port unavailable');
    try {
      if (!await port.open()) throw StateError('usb port open failed');
      await port.setPortParameters(115200, UsbPort.DATABITS_8, UsbPort.STOPBITS_1, UsbPort.PARITY_NONE);
      final bytes = await escPosRasterBytes(pngBytes);
      await port.write(Uint8List.fromList(bytes));
    } finally {
      await port.close();
    }
  }
}
