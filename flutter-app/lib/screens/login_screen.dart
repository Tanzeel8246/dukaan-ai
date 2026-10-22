import 'package:flutter/material.dart';

import '../services/auth_service.dart';

/// Dukaan AI — email/password login + sign-up.
///
/// Shown only when Firebase is configured (see AuthService). Everything
/// keeps working locally on sqflite; signing in unlocks private cloud
/// sync under the shopkeeper's own `users/{uid}` namespace.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signUp = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final err = _signUp
        ? await AuthService.signUp(_email.text, _password.text)
        : await AuthService.signIn(_email.text, _password.text);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = err;
    });
    // On success the auth gate in main.dart swaps this screen for the app.
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: scheme.primary,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(Icons.shopping_basket_outlined,
                        color: Colors.white, size: 32),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    _signUp ? 'Create your shop account' : 'Welcome back',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _signUp
                        ? 'Sign up to sync your shop privately across devices.'
                        : 'Sign in to sync your shop data privately.',
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _submit(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Text(_error!,
                        style: TextStyle(color: scheme.error)),
                  ],
                  const SizedBox(height: 22),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: Text(_busy
                        ? 'Please wait…'
                        : _signUp
                            ? 'Create account'
                            : 'Sign in'),
                  ),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => setState(() {
                              _signUp = !_signUp;
                              _error = null;
                            }),
                    child: Text(_signUp
                        ? 'Already have an account? Sign in'
                        : 'New to Dukaan AI? Create an account'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
