# Alô Saúde — Features

## 1. Problema que queremos resolver

Muitas pessoas têm dificuldade para entender como acessar os serviços do SUS. Frequentemente, não sabem qual unidade procurar, onde realizar determinado procedimento, como marcar uma consulta ou quais são os caminhos disponíveis para conseguir atendimento.

Essa dificuldade pode fazer com que os cidadãos procurem unidades inadequadas para suas necessidades, enfrentem deslocamentos desnecessários ou deixem de utilizar serviços públicos aos quais têm direito.

Nosso objetivo é reduzir essas barreiras, tornando o acesso ao SUS mais simples, compreensível e acessível, especialmente para pessoas com pouca familiaridade com tecnologia ou com o funcionamento do sistema público de saúde.

## 2. Como a solução funcionaria

O aplicativo teria uma interface simples e acessível, na qual o usuário poderia conversar com o assistente virtual por texto ou voz. O assistente também responderia nos dois formatos, utilizando uma linguagem clara, acolhedora e fácil de compreender e também seria capaz de identificar e compreender gírias regionais.

A partir da conversa, o sistema identifica a necessidade do usuário e o orienta sobre o caminho mais adequado para conseguir atendimento no SUS.

A orientação poderia envolver a indicação de um serviço presencial próximo, instruções para acessar um serviço digital ou explicações sobre os procedimentos necessários para conseguir determinado atendimento.

### Exemplos de utilização

**Caso 1 — Vacinação.** O usuário pergunta: “Quero tomar a vacina contra a gripe. Onde posso me vacinar e quais documentos preciso levar?” O assistente identifica qual vacina o usuário procura e orienta sobre os documentos necessários para levar no dia e os locais de vacinação disponíveis na rede pública, considerando sua localização e as informações disponíveis sobre os serviços.

**Caso 2 — Sintomas de saúde.** O usuário relata: “Estou com febre, dor de cabeça e tosse. Onde devo procurar atendimento?” O assistente coleta as informações estritamente necessárias para orientar o usuário sobre o nível de atendimento adequado e os serviços que ele pode procurar, respeitando protocolos de segurança validados por profissionais de saúde. O sistema não deve realizar diagnósticos definitivos nem substituir uma avaliação médica. Também deve reconhecer sinais de alerta e orientar a busca por atendimento de urgência quando necessário.

**Caso 3 — Teleconsulta e atendimento domiciliar.** O usuário pergunta: “Quero fazer uma consulta médica sem sair de casa. Como consigo?” O assistente explica as possibilidades de atendimento remoto disponíveis pelo SUS em sua região e apresenta instruções práticas para acessá-las.

**Caso 4 — Consulta de rotina.** O usuário pergunta: “Preciso marcar uma consulta de rotina. Onde devo ir?” O assistente explica como procurar a Unidade Básica de Saúde (UBS) de referência, como verificar os procedimentos de agendamento e quais informações o usuário precisa consultar ou apresentar.

**Caso 5 — Necessidade de atendimento presencial.** Quando a necessidade exigir atendimento presencial, o aplicativo poderá utilizar a localização do usuário para indicar unidades de saúde pertinentes, apresentando, sempre que possível, endereço, distância, tipo de serviço oferecido e orientações para chegar ao atendimento adequado. A indicação deverá considerar o serviço que o usuário precisa, e não apenas a proximidade geográfica.

## 3. Funcionalidades centrais

- **Assistente por texto e voz:** permitir que o usuário explique sua necessidade de maneira natural e receba respostas escritas e/ou faladas.
- **Identificação da necessidade:** compreender o objetivo da pessoa e fazer perguntas complementares quando forem necessárias para orientar corretamente.
- **Orientação sobre os serviços do SUS:** explicar onde e como buscar vacinação, consultas, atendimento básico, serviços especializados, atendimento remoto e outros serviços disponíveis.
- **Geolocalização:** indicar unidades de saúde adequadas à necessidade do usuário, considerando sua localização e a disponibilidade de informações confiáveis.
- **Orientação prática:** explicar os próximos passos, incluindo como procurar a unidade, quais canais utilizar e como verificar os procedimentos de agendamento.
- **Acessibilidade:** utilizar linguagem simples, interface intuitiva e interação por voz para facilitar o uso por pessoas com diferentes níveis de alfabetização digital e identificação de gírias regionais.
- **Segurança das orientações:** reconhecer situações que exigem atendimento urgente e evitar que o assistente substitua profissionais de saúde.

## 4. Limites e cuidados da solução

O aplicativo deverá funcionar como um orientador de acesso aos serviços de saúde, e não como um substituto para médicos ou outros profissionais. É importante considerar:

- A diferença entre orientar o acesso a um serviço e realizar uma triagem clínica.
- A necessidade de utilizar protocolos de segurança validados para direcionar o usuário ao serviço adequado.
- A variação dos serviços, horários, formas de agendamento e modalidades de teleatendimento entre municípios.
- A confiabilidade e a atualização das informações sobre as unidades de saúde.
- A proteção dos dados pessoais e das informações de saúde dos usuários, respeitando a LGPD.
- A necessidade de oferecer orientações úteis mesmo quando o aplicativo não tiver acesso à localização ou não conseguir confirmar determinada informação.

Quando não houver dados suficientes para fornecer uma orientação confiável, o assistente deverá explicar essa limitação e indicar como o usuário pode confirmar a informação por canais oficiais, ampliando a segurança do usuário.
