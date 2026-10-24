/// Dukaan AI — RBAC convenience layer (Dart port of web/lib/
/// permissions.ts `can()`). The matrix itself is GENERATED data
/// (permissions_data.dart, from the web source) so it cannot drift;
/// Firestore rules remain the enforcement — this layer only keeps
/// denied actions out of sight, exactly as on web.
import 'permissions_data.dart';

/// The full client-side role: a stored staff role, the implicit
/// owner, or "none" (signed in but attached to no shop).
/// owner | manager | cashier | accountant | none
typedef ShopRole = String;

/// Access for (role, module): "full" | "read" | "none".
String accessFor(String role, String module) {
  final row = permissionMatrixData[module];
  if (row == null) return 'none';
  return row[role] ?? 'none';
}

/// can(role, module, action): action is "view" (read suffices) or
/// "write" (full required) — the web's two-grain call shape.
bool can(String role, String module, String action) {
  if (role == 'none') return false;
  final level = accessFor(role, module);
  if (action == 'write') return level == 'full';
  return level == 'full' || level == 'read';
}

/// Resolve a staff member's role: a stored role wins; a staff record
/// with no role resolves to "manager" (the legacy profile, A3).
String resolveStaffRole(Map<String, dynamic>? staffRecord) {
  final role = staffRecord?['role'];
  if (role == 'manager' || role == 'cashier' || role == 'accountant') {
    return role as String;
  }
  return 'manager';
}
