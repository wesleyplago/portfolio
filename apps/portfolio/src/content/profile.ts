/**
 * Conteúdo do portfólio. Edite aqui: nome, chamada, links.
 * TODO(você): confirme o nome de exibição e adicione LinkedIn / e-mail se quiser.
 */
export const profile = {
  name: 'Wesley',
  handle: 'wesleyplago',
  headline: 'Engenharia de pagamentos e IA que não cobra duas vezes',
  fact: '12 anos em Pix, boleto, ledger e gateway',
  // TODO(Wesley): preencher LinkedIn e e-mail; a UI de contato esconde link vazio.
  contact: { linkedin: '', email: '' },
  links: [{ label: 'GitHub', href: 'https://github.com/wesleyplago' }],
  /** "Como eu trabalho": cada princípio aponta para o projeto que o prova (id da banda na home). */
  principles: [
    {
      title: 'Dinheiro não sai duas vezes',
      proof: 'Idempotência e invariante contábil checados sob falha injetada: 1.000 execuções de caos, 0 cobranças duplicadas.',
      slug: 'payops',
    },
    {
      title: 'A IA propõe, uma pessoa aprova',
      proof: 'O agente não move dinheiro sozinho: a aprovação é por token de uso único, amarrado à ação exata.',
      slug: 'payops',
    },
    {
      title: 'Medir antes de afirmar',
      proof: 'Retrieval avaliado com intervalo de confiança, e o CI falha se o recall cair mais de 2 pontos.',
      slug: 'rag',
    },
    {
      title: 'Sistemas que conversam por eventos',
      proof: 'Seis bounded contexts com outbox, inbox idempotente e DLQ, rodando igual na AWS e no GCP.',
      slug: 'lagoski',
    },
  ] as { title: string; proof: string; slug: string }[],
};
